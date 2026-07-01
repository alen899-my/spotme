"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import type { Exercise } from "@/types"

/* -------------------------------------------------------------------------- */
/*  Phase classification                                                      */
/* -------------------------------------------------------------------------- */

type Phase = "setup" | "movement" | "peak" | "return"

const PHASE_KEYWORDS: Record<Phase, string[]> = {
  setup: [
    "starting position",
    "start position",
    "stand",
    "sit",
    "lie down",
    "lie flat",
    "grip",
    "grasp",
    "begin by",
    "set up",
    "position yourself",
    "stance",
    "start with",
    "hold the bar",
    "hold a",
    "hold the",
    "feet shoulder",
    "place your",
    "rest the",
    "partner",
    "spotter",
    "have a partner",
    "secure your",
    "with assistance",
    "assisted",
    "using a partner",
  ],
  movement: [
    "lift",
    "raise",
    "push",
    "pull",
    "lower the",
    "curl",
    "press",
    "extend",
    "bend",
    "drive",
    "row",
    "bring the",
    "flex",
    "rotate",
    "swing",
    "kick",
  ],
  peak: [
    "squeeze",
    "contract",
    "pause",
    "hold for",
    "at the top",
    "full extension",
    "peak contraction",
    "fully extended",
    "fully flexed",
    "maximum",
    "briefly hold",
  ],
  return: [
    "return to",
    "lower back to",
    "back to the starting",
    "back to start",
    "release",
    "repeat",
    "slowly lower",
    "lower slowly",
    "reset",
  ],
}

function classifySentence(sentence: string): Phase | null {
  const lower = sentence.toLowerCase()
  // Order matters: check return/peak before generic movement words so
  // e.g. "squeeze and lower back down" lands correctly.
  if (PHASE_KEYWORDS.return.some((w) => lower.includes(w))) return "return"
  if (PHASE_KEYWORDS.peak.some((w) => lower.includes(w))) return "peak"
  if (PHASE_KEYWORDS.setup.some((w) => lower.includes(w))) return "setup"
  if (PHASE_KEYWORDS.movement.some((w) => lower.includes(w))) return "movement"
  return null
}

interface Phases {
  setup: string
  movement: string
  peak: string
  return: string
}

/**
 * Splits raw exercise instructions into setup / movement / peak / return
 * phases. First pass: keyword-based classification, so frames actually
 * reflect what the instruction text says happens at each stage. Falls back
 * to an even three-way split only when no keywords are detected at all.
 */
function splitInstructions(text: string): Phases {
  const sentences = text
    .split(/[.\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (sentences.length === 0) {
    return { setup: text, movement: text, peak: text, return: text }
  }

  const buckets: Record<Phase, string[]> = {
    setup: [],
    movement: [],
    peak: [],
    return: [],
  }
  const unclassified: string[] = []

  sentences.forEach((s) => {
    const phase = classifySentence(s)
    if (phase) buckets[phase].push(s)
    else unclassified.push(s)
  })

  const anyClassified =
    buckets.setup.length + buckets.movement.length + buckets.peak.length + buckets.return.length > 0

  if (!anyClassified) {
    // Fallback: old even split by thirds.
    const third = Math.ceil(sentences.length / 3)
    return {
      setup: sentences.slice(0, third).join(". "),
      movement: sentences.slice(third, third * 2).join(". "),
      peak: sentences.slice(third * 2).join(". "),
      return: sentences[0],
    }
  }

  // Backfill any empty bucket sensibly instead of leaving it blank.
  if (buckets.setup.length === 0) {
    buckets.setup.push(sentences[0])
  }
  if (buckets.movement.length === 0) {
    buckets.movement.push(unclassified[0] || sentences[Math.min(1, sentences.length - 1)])
  }
  if (buckets.peak.length === 0) {
    buckets.peak.push(sentences[sentences.length - 1])
  }
  if (buckets.return.length === 0) {
    // Return should mirror the starting position whenever the instructions
    // don't explicitly describe a "return to start" step.
    buckets.return.push(buckets.setup[0])
  }

  return {
    setup: buckets.setup.join(". "),
    movement: buckets.movement.join(". "),
    peak: buckets.peak.join(". "),
    return: buckets.return.join(". "),
  }
}

/* -------------------------------------------------------------------------- */
/*  Prompt template                                                           */
/* -------------------------------------------------------------------------- */

function needsAssistant(exercise: Exercise): boolean {
  const name = exercise.name.toLowerCase()
  const instructions = (exercise.instructions_en || "").toLowerCase()
  return (
    exercise.equipment === "assisted" ||
    name.includes("assisted") ||
    instructions.includes("partner") ||
    instructions.includes("spotter") ||
    instructions.includes("have a partner") ||
    instructions.includes("with assistance") ||
    instructions.includes("using a partner")
  )
}

const ASSISTANT_NOTE = `
Assistant / Spotter Requirement:
This exercise requires or can be performed with a second person (assistant/spotter/partner). The assistant is visible in frame, positioned to support or secure the working character as described in the instructions below. Render the assistant in athletic gym attire (neutral colors) — distinct from the main character so there is no visual confusion. The assistant's face should be partially obscured or turned away, keeping full focus on the main character. The assistant's hands/positioning must match the supporting role described in the exercise instructions. Maintain the assistant consistently across all frames.
`

const PROMPT_TEMPLATE = `AI Image Generation – {EXERCISE_NAME} (Frame-by-Frame)

Reference Character: Use the uploaded anime fitness coach as the exact character reference. Maintain identical facial features, hairstyle, skin tone, muscular proportions, cel-shaded anime style, and premium rendering quality across all frames. Character is shirtless (bare torso, no tank top or shirt) so the muscle highlight overlay is fully visible directly on the skin — wearing only black shorts, black athletic shoes, and a smartwatch. The character must remain perfectly consistent in every frame.

Exercise: {EXERCISE_NAME}
Category: {CATEGORY}
Equipment: {EQUIPMENT}
Target Muscles: {TARGET}
{ASSISTANT_NOTE}
Starting Position (Reference — used for Frame 1 and to reset Frame 4):
{START_POSITION}

Full Exercise Instructions:
{INSTRUCTIONS}

Style:
Premium anime fitness coach
High-end cel-shaded illustration
Luxury modern gym
Cinematic lighting
Ultra detailed muscular anatomy
Sharp outlines
High contrast
4K quality
Consistent proportions
Consistent facial expression

Muscle Highlight System (Red Overlay — Highest Priority):
In every frame, render a translucent RED glow/heat-map overlay directly on top of the {TARGET} muscle group to show which muscles are working. This is a soft, semi-transparent red highlight sitting on the skin over the muscle, similar to a thermal/EMG activation map — not a flat color fill, not clothing, not a tattoo.
- The red highlight must ONLY appear over the {TARGET} muscles — no other muscle group should be tinted.
- Intensity scales with how hard the muscle is working in that frame (see per-frame notes below).
- The glow should follow the underlying muscle shape and anatomy, brightening/dimming smoothly frame to frame so it reads as one continuous animation when viewed in sequence.
- Everything else about the character (skin tone, clothing, face, hair) stays completely unaffected by the highlight.

IMPORTANT — Generate ONE image at a time:
Step 1: Generate only Frame 1 (Starting Position). Wait for my confirmation.
Step 2: After I say "Next, generate next frame image", generate Frame 2 (Mid Lift) — same background, same everything, only movement and muscle-highlight intensity changes.
Step 3: After I say "Next, generate next frame image", generate Frame 3 (Peak Contraction) — same background, same everything, only movement and muscle-highlight intensity changes.
Step 4: After I say "Next, generate next frame image", generate Frame 4 (Return Position) — back to starting pose, same background, highlight fades back to resting level.

Do NOT generate multiple frames in one response. Only 1 image per response.

Frame 1 — Starting Position (Setup)
{START_POSITION}
Camera: front-right 3/4 angle. Character fully set up and ready. Neutral expression. All equipment in correct starting position.{ASSISTANT_SETUP} This frame sets the background, lighting, and framing for all subsequent frames.
Muscle Highlight: Faint red glow (roughly 10–20% opacity) on the {TARGET} — muscle is engaged for stabilization only, not yet under load.

Frame 2 — Mid Lift (Movement Phase)
{MID_LIFT}
ONLY the movement and highlight intensity change. Background, lighting, camera, character, clothes, equipment — EVERYTHING ELSE is 100% identical to Frame 1.
Muscle Highlight: Medium red glow (roughly 45–60% opacity) on the {TARGET}, brighter than Frame 1, showing rising activation as the muscle takes on load.

Frame 3 — Peak Contraction (Full Engagement)
{PEAK_CONTRACTION}
Maximum range of motion. Muscles fully engaged and flexed. Background, lighting, camera, character — ALL identical to Frame 1.
Muscle Highlight: Brightest, most saturated red glow (roughly 85–100% opacity) directly over the {TARGET}, clearly outlining the fully contracted muscle fibers — this is the visual peak of the highlight effect.

Frame 4 — Return Position (Reset)
{RETURN_POSITION}
Identical to Frame 1 in every way — background, lighting, character pose, camera angle. Perfect loop point. Pose must match the Starting Position reference above exactly.
Muscle Highlight: Fades back down to a faint red glow (roughly 10–20% opacity), matching Frame 1, as the muscle returns to rest.

Biomechanics (Highest Priority):
This is a true {EXERCISE_NAME}.
Only the working joints move.
Torso remains still.
Grip never changes.
No swinging.
No momentum.
Constant tension throughout.
Follow the exercise instructions exactly for each phase.
Same camera in every frame: medium front-right three-quarter view.
Same zoom, same focal length. No camera movement. No perspective changes.

Negative Prompt:
Different face, different hairstyle, inconsistent character design, different clothing, changing body proportions, changing background, different gym, different lighting, different camera angle, elbow bending, finger curl, wrist flexion instead of extension, forearm rotation, shoulder movement, torso movement, swinging, clipping, distorted anatomy, extra fingers, blurry image, motion blur, watermark, text, logo, UI, cropped limbs, inconsistent gym equipment, inconsistent lighting, inconsistent camera angle, red highlight bleeding onto non-target muscles, flat opaque red fill, red highlight on clothing, missing muscle highlight, inconsistent highlight shape between frames, tank top, t-shirt, shirt, covered torso, sleeves, jacket, second character incorrectly rendered, assistant/spotter missing, assistant blocking the view, assistant wearing same outfit as main character.`

interface PromptBuilderProps {
  exercise: Exercise
  compact?: boolean
}

function generateBasePrompt(exercise: Exercise): string {
  const instructions = exercise.instructions_en || "Follow standard biomechanics for this exercise"
  const phases = splitInstructions(instructions)
  const hasAssistant = needsAssistant(exercise)

  return PROMPT_TEMPLATE
    .replace(/{EXERCISE_NAME}/g, exercise.name)
    .replace(/{CATEGORY}/g, exercise.category || "N/A")
    .replace(/{EQUIPMENT}/g, exercise.equipment || "N/A")
    .replace(/{TARGET}/g, exercise.target || exercise.muscle_group || "N/A")
    .replace(/{INSTRUCTIONS}/g, instructions)
    .replace(/{START_POSITION}/g, phases.setup)
    .replace(/{MID_LIFT}/g, phases.movement)
    .replace(/{PEAK_CONTRACTION}/g, phases.peak)
    .replace(/{RETURN_POSITION}/g, phases.return)
    .replace(/{ASSISTANT_NOTE}/g, hasAssistant ? ASSISTANT_NOTE : "")
    .replace(/{ASSISTANT_SETUP}/g, hasAssistant ? " Assistant/spotter is positioned appropriately to support the movement as described in the instructions." : "")
}

const frameLabels = ["Frame 1 — Starting Position", "Frame 2 — Mid Lift", "Frame 3 — Peak Contraction"]

export function PromptBuilder({ exercise, compact }: PromptBuilderProps) {
  const [copied, setCopied] = useState<number | null>(null)

  const handleCopy = async (frameIdx?: number) => {
    try {
      const prompt = generateBasePrompt(exercise)
      await navigator.clipboard.writeText(prompt)
      setCopied(frameIdx ?? -1)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  const handleCopyGifPrompt = async () => {
    try {
      const prompt = generateGifPrompt()
      await navigator.clipboard.writeText(prompt)
      setCopied(-2)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  if (compact) {
    return (
      <button
        onClick={() => handleCopy()}
        className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors hover:bg-secondary"
      >
        {copied === -1 ? (
          <><Check className="h-2.5 w-2.5 text-green-500" /> Copied</>
        ) : (
          <><Copy className="h-2.5 w-2.5" /> Copy Prompt</>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        onClick={() => handleCopy()}
        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-secondary"
      >
        {copied === -1 ? (
          <><Check className="h-3 w-3 text-green-500" /> Copied</>
        ) : (
          <><Copy className="h-3 w-3" /> Copy Full Prompt</>
        )}
      </button>
      {frameLabels.map((label, i) => (
        <button
          key={i}
          onClick={() => handleCopy(i)}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-secondary"
        >
          {copied === i ? (
            <Check className="h-2.5 w-2.5 text-green-500" />
          ) : (
            <Copy className="h-2.5 w-2.5" />
          )}
          F{i + 1}
        </button>
      ))}
      <button
        onClick={handleCopyGifPrompt}
        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors hover:bg-secondary"
      >
        {copied === -2 ? (
          <><Check className="h-2.5 w-2.5 text-green-500" /> Copied</>
        ) : (
          <><Copy className="h-2.5 w-2.5" /> GIF Prompt</>
        )}
      </button>
    </div>
  )
}

const GIF_PROMPT = `I have a reference GIF of a workout exercise. I have uploaded a character image that I want to use as the character.

Can you generate 2 frame images from this gif to make a new gif using the character image I uploaded. Same exact movement from the gif. Need 2 frames so if they combined will get new gif. First give me the first frame.

Character Appearance:
- Use the uploaded character image as the exact reference
- Maintain identical facial features, hairstyle, skin tone, body proportions, and clothing across both frames
- The character must look exactly the same in every frame — only the pose changes

Background:
- Use the old gym appearance and background setting from the reference GIF
- Maintain the same gym environment, equipment, lighting, and atmosphere in both frames
- The background must be identical in frame 1 and frame 2 — only the character's pose changes

Requirements:
- Frame 1: Starting position of the movement (exact same pose as the start of the gif)
- Frame 2: End/peak position of the movement (exact same pose as the end of the gif)
- Background, lighting, camera angle must be identical in both frames
- When frame 1 and frame 2 are combined sequentially, they should reproduce the exact movement from the reference gif

Generate ONE image at a time. First generate Frame 1. After I confirm, then generate Frame 2.`

export { generateBasePrompt as generateExercisePrompt }

export function generateGifPrompt(): string {
  return GIF_PROMPT
}
