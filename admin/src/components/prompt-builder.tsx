"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import type { Exercise } from "@/types"

function splitInstructions(text: string): { setup: string; movement: string; peak: string; return: string } {
  const sentences = text
    .split(/[.\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (sentences.length <= 3) {
    const all = sentences.join(". ")
    return {
      setup: sentences[0] || all,
      movement: sentences[1] || all,
      peak: sentences[sentences.length - 1] || all,
      return: sentences[0] || all,
    }
  }

  const third = Math.ceil(sentences.length / 3)
  return {
    setup: sentences.slice(0, third).join(". "),
    movement: sentences.slice(third, third * 2).join(". "),
    peak: sentences.slice(third * 2).join(". "),
    return: sentences[0],
  }
}

const PROMPT_TEMPLATE = `AI Image Generation – {EXERCISE_NAME} (Frame-by-Frame)

Reference Character: Use the uploaded anime fitness coach as the exact character reference. Maintain identical facial features, hairstyle, skin tone, muscular proportions, clothing (black tank top, black shorts, black athletic shoes, smartwatch), cel-shaded anime style, and premium rendering quality across all frames. The character must remain perfectly consistent in every frame.

Exercise: {EXERCISE_NAME}
Category: {CATEGORY}
Equipment: {EQUIPMENT}
Target Muscles: {TARGET}

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

CRITICAL — Background & Environment Consistency:
The background, gym environment, lighting, camera angle, zoom level, framing, equipment placement, and character position must be EXACTLY THE SAME in every frame. The only thing that changes between frames is the position of the working muscles/joints. Everything else — background, lighting, shadows, equipment, clothes, hair, facial expression — must remain completely identical across all frames.

IMPORTANT — Generate ONE image at a time:
Step 1: Generate only Frame 1 (Starting Position). Wait for my confirmation.
Step 2: After I say "Next, generate next frame image", generate Frame 2 (Mid Lift) — same background, same everything, only movement changes.
Step 3: After I say "Next, generate next frame image", generate Frame 3 (Peak Contraction) — same background, same everything, only movement changes.
Step 4: After I say "Next, generate next frame image", generate Frame 4 (Return Position) — back to starting pose, same background.

Do NOT generate multiple frames in one response. Only 1 image per response.

Frame 1 — Starting Position (Setup)
{START_POSITION}
Camera: front-right 3/4 angle. Character fully set up and ready. Neutral expression. All equipment in correct starting position. This frame sets the background, lighting, and framing for all subsequent frames.

Frame 2 — Mid Lift (Movement Phase)
{MID_LIFT}
ONLY the movement changes. Background, lighting, camera, character, clothes, equipment — EVERYTHING ELSE is 100% identical to Frame 1.

Frame 3 — Peak Contraction (Full Engagement)
{PEAK_CONTRACTION}
Maximum range of motion. Muscles fully engaged and flexed. Background, lighting, camera, character — ALL identical to Frame 1.

Frame 4 — Return Position (Reset)
{RETURN_POSITION}
Identical to Frame 1 in every way — background, lighting, character pose, camera angle. Perfect loop point.

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
Different face, different hairstyle, inconsistent character design, different clothing, changing body proportions, changing background, different gym, different lighting, different camera angle, elbow bending, finger curl, wrist flexion instead of extension, forearm rotation, shoulder movement, torso movement, swinging, clipping, distorted anatomy, extra fingers, blurry image, motion blur, watermark, text, logo, UI, cropped limbs, inconsistent gym equipment, inconsistent lighting, inconsistent camera angle.`

interface PromptBuilderProps {
  exercise: Exercise
  compact?: boolean
}

function generateBasePrompt(exercise: Exercise): string {
  const instructions = exercise.instructions_en || "Follow standard biomechanics for this exercise"
  const phases = splitInstructions(instructions)

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
    </div>
  )
}

export { generateBasePrompt as generateExercisePrompt }
