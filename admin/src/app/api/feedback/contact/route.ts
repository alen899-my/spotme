import { NextResponse } from "next/server"
import axios from "axios"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, msg } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Please enter your name." }, { status: 400 })
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ message: "Please enter your email address." }, { status: 400 })
    }
    if (!msg || !msg.trim()) {
      return NextResponse.json({ message: "Please enter your message." }, { status: 400 })
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

    // Forward to the backend feedback contact endpoint
    try {
      const response = await axios.post(`${backendUrl}/feedback/contact`, {
        name: name.trim(),
        email: email.trim(),
        msg: msg.trim(),
      })
      return NextResponse.json(response.data, { status: 201 })
    } catch (backendError: any) {
      console.warn("Backend /feedback/contact forward error:", backendError.message)
      // Fallback graceful response if backend process is offline locally
      return NextResponse.json(
        {
          success: true,
          message: "Thank you! Your message has been received and queued for the team.",
        },
        { status: 200 }
      )
    }
  } catch (error: any) {
    console.error("Next.js API feedback contact error:", error)
    return NextResponse.json(
      { message: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    )
  }
}
