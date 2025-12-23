import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const submissionData = await request.json();
    const formspreeUrl = process.env.NEXT_PUBLIC_FORMSPREE_URL;

    if (!formspreeUrl) {
      console.error("Formspree URL is not configured in environment variables.");
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const response = await fetch(formspreeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(submissionData),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Formspree submission failed:", errorBody);
      return NextResponse.json({ error: "Failed to submit to form provider." }, { status: response.status });
    }

    return NextResponse.json({ message: "Submission successful!" }, { status: 200 });

  } catch (error) {
    console.error("Error processing submission:", error);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
