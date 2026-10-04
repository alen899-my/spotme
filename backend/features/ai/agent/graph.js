'use strict';

/**
 * agent/graph.js — LangGraph ReAct graph (retrieve -> agent -> tools -> respond).
 *
 * Nodes:
 *   agent   : chat model (bindTools when tools exist) decides: tool_calls | final text
 *   tools   : executes StructuredTools, destructive -> { needsConfirm } marker
 *   respond : final prose pass (model without tools, or pass-through text)
 * Edges: agent --(tool_calls)--> tools --> agent ; agent --(text)--> respond --> END
 * Cap: MAX_TOOL_ROUNDS (4) to bound cost/latency, same as legacy loop.
 *
 * buildGraph({ model, tools }) returns compiled graph or null when
 * @langchain/langgraph is unavailable (code-first phase) — runner falls back
 * to the legacy envelope loop automatically. No throw, ever.
 */

const MAX_TOOL_ROUNDS = 4;

function tryLoadLangGraph() {
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    const { StateGraph, END, START } = require('@langchain/langgraph');
    // eslint-disable-next-line global-require, import/no-unresolved
    const { HumanMessage, SystemMessage, ToolMessage } = require('@langchain/core/messages');
    return { StateGraph, END, START, HumanMessage, SystemMessage, ToolMessage };
  } catch (e) {
    console.warn(`[agent/graph] langgraph unavailable (${e.message}) — legacy loop.`);
    return null;
  }
}

function buildGraph({ model, tools = [] } = {}) {
  if (!model) return null;
  const lg = tryLoadLangGraph();
  if (!lg) return null;
  const { StateGraph, END, START, ToolMessage } = lg;

  const bound = tools.length && typeof model.bindTools === 'function'
    ? model.bindTools(tools)
    : model;

  const toolMap = new Map((tools || []).map((t) => [t.name, t]));

  async function agentNode(state) {
    const res = await bound.invoke(state.messages);
    const calls = res.tool_calls && res.tool_calls.length ? res.tool_calls : null;
    return {
      messages: [res],
      rounds: (state.rounds || 0) + 1,
      pendingConfirms: state.pendingConfirms || [],
      done: !calls || (state.rounds || 0) + 1 >= MAX_TOOL_ROUNDS,
    };
  }

  async function toolsNode(state) {
    const last = state.messages[state.messages.length - 1];
    const outputs = [];
    const pendingConfirms = [...(state.pendingConfirms || [])];
    for (const call of last.tool_calls || []) {
      const tool = toolMap.get(call.name);
      if (!tool) {
        outputs.push(
          new ToolMessage({ content: `ERROR unknown tool ${call.name}`, tool_call_id: call.id })
        );
        continue;
      }
      try {
        const raw = await tool.invoke(call.args || {});
        let parsed = null;
        try {
          parsed = JSON.parse(String(raw));
        } catch (_) {}
        if (parsed && parsed.needsConfirm) {
          pendingConfirms.push(parsed);
          outputs.push(
            new ToolMessage({
              content: `PENDING USER CONFIRMATION ("${parsed.label}"). Ask the user to confirm in words.`,
              tool_call_id: call.id,
            })
          );
        } else {
          outputs.push(new ToolMessage({ content: String(raw).slice(0, 2000), tool_call_id: call.id }));
        }
      } catch (e) {
        outputs.push(
          new ToolMessage({ content: `ERROR ${e.message}`, tool_call_id: call.id })
        );
      }
    }
    return { messages: outputs, pendingConfirms };
  }

  function route(state) {
    if (state.done) return 'respond';
    const last = state.messages[state.messages.length - 1];
    if (last.tool_calls && last.tool_calls.length) return 'tools';
    return 'respond';
  }

  async function respondNode(state) {
    // If last message already prose (no tool calls), pass through.
    const last = state.messages[state.messages.length - 1];
    if ((!last.tool_calls || !last.tool_calls.length) && typeof last.content === 'string' && last.content.trim()) {
      return { final: last.content };
    }
    const res = await model.invoke([
      ...state.messages,
      {
        role: 'user',
        content: 'Give the final coaching answer in prose now (no tool calls), summarizing what was done.',
      },
    ]);
    const text = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
    return { final: text };
  }

  const g = new StateGraph({
    channels: {
      messages: { value: (a = [], b = []) => a.concat(b), default: () => [] },
      rounds: { value: (a = 0, b = 0) => b, default: () => 0 },
      pendingConfirms: { value: (a = [], b = []) => b, default: () => [] },
      final: { value: (a = '', b = '') => b || a, default: () => '' },
    },
  });
  g.addNode('agent', agentNode);
  g.addNode('tools', toolsNode);
  g.addNode('respond', respondNode);
  g.addEdge(START, 'agent');
  g.addConditionalEdges('agent', route, { tools: 'tools', respond: 'respond' });
  g.addEdge('tools', 'agent');
  g.addEdge('respond', END);
  return g.compile();
}

module.exports = { buildGraph, MAX_TOOL_ROUNDS };
