"use client"

import { useState } from "react"
import Image from "next/image"
import { SITE_IMAGE_FALLBACKS } from "@/lib/site-images"
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import axios from "axios"

export function MeetTeamCtaSection({ srcMap }: { srcMap?: Record<string, string> }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [msg, setMsg] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [feedbackMsg, setFeedbackMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setStatus("error")
      setFeedbackMsg("Please enter your name.")
      return
    }
    if (!email.trim() || !email.includes("@")) {
      setStatus("error")
      setFeedbackMsg("Please enter a valid email address.")
      return
    }
    if (!msg.trim()) {
      setStatus("error")
      setFeedbackMsg("Please enter your message.")
      return
    }

    setStatus("loading")
    setFeedbackMsg("")

    try {
      const res = await axios.post("/api/feedback/contact", {
        name: name.trim(),
        email: email.trim(),
        msg: msg.trim(),
      })

      if (res.data.success) {
        setStatus("success")
        setFeedbackMsg(res.data.message || "Thank you! Your message has been sent to the team.")
        setName("")
        setEmail("")
        setMsg("")
      } else {
        setStatus("error")
        setFeedbackMsg(res.data.message || "Failed to send message. Please try again.")
      }
    } catch (err: any) {
      console.error("Form submit error:", err)
      const errorText =
        err.response?.data?.message || "Failed to connect to the mailing service. Please try again later."
      setStatus("error")
      setFeedbackMsg(errorText)
    }
  }

  return (
    <section
      id="contact"
      className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 border-t border-neutral-200/80 dark:border-neutral-800 overflow-hidden"
    >
      {/* Section Editorial Header */}
      <div className="max-w-3xl mb-10 sm:mb-14">
        <span className="text-xs font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
          Get in Touch
        </span>
        <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Meet the team behind SpotMe.
        </h2>
        <p className="mt-3.5 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
          Have questions, ideas, or feedback about your workouts? Send us a message and we will reply directly to your email.
        </p>
      </div>

      {/* Combined Single Card: Left Side Image, Right Side Form */}
      <div className="rounded-3xl bg-neutral-950 dark:bg-black text-white shadow-2xl overflow-hidden transition-all duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* LEFT: Clean Image Integrated Directly into the Card */}
          <div className="lg:col-span-5 relative min-h-[300px] sm:min-h-[400px] lg:min-h-[460px] w-full bg-neutral-900/60 flex items-center justify-center p-6 sm:p-10">
            <div className="relative w-full h-full min-h-[260px] sm:min-h-[320px]">
              <Image
                src={srcMap?.["team-cheer"] || SITE_IMAGE_FALLBACKS["team-cheer"]}
                alt="SpotMe Community Team"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
              />
            </div>
          </div>

          {/* RIGHT: Form Integrated Directly into the Card */}
          <div className="lg:col-span-7 flex flex-col justify-center p-6 sm:p-9 lg:p-12">
            <div className="mb-6">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Send us a message
              </h3>
              <p className="mt-1.5 text-sm text-neutral-400">
                We read every note and reply directly to your inbox.
              </p>
            </div>

            {/* Status Alert Banner */}
            {status === "success" && (
              <div className="mb-5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-bold">Message Sent!</strong>
                  <span>{feedbackMsg}</span>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="mb-5 rounded-xl bg-rose-950/80 border border-rose-500/40 p-3.5 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-bold">Error:</strong>
                  <span>{feedbackMsg}</span>
                </div>
              </div>
            )}

            {/* Form Fields: name, email, msg */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label htmlFor="form-name" className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Name
                  </label>
                  <input
                    id="form-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    disabled={status === "loading"}
                    className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-[#F7CB16]/60 transition-colors disabled:opacity-50"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="form-email" className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    id="form-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    disabled={status === "loading"}
                    className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-[#F7CB16]/60 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Message (msg) */}
              <div>
                <label htmlFor="form-msg" className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Message
                </label>
                <textarea
                  id="form-msg"
                  rows={4}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="What's on your mind? Ask a question or share feedback..."
                  disabled={status === "loading"}
                  className="w-full rounded-xl bg-neutral-900 border border-neutral-800 p-3.5 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-[#F7CB16]/60 transition-colors resize-none disabled:opacity-50"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F7CB16] hover:bg-[#E5BC14] text-neutral-950 font-bold text-sm px-6 py-3 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </section>
  )
}
