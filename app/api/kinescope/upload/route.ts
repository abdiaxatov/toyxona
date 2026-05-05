import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { title, filename, filesize } = await req.json()
    const token = "d8ac7e05-4df2-4cc4-b986-283863955de8"

    // 1. Get project ID first
    const projectsResponse = await fetch("https://api.kinescope.io/v1/projects", {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!projectsResponse.ok) {
      const errorData = await projectsResponse.json()
      return NextResponse.json({ success: false, error: "Failed to fetch projects: " + (errorData.message || projectsResponse.statusText) }, { status: projectsResponse.status })
    }

    const projectsData = await projectsResponse.json()
    const projectId = projectsData.data[0]?.id

    if (!projectId) {
      return NextResponse.json({ success: false, error: "No Kinescope projects found" }, { status: 400 })
    }

    // 2. Init upload
    const response = await fetch("https://uploader.kinescope.io/v2/init", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title,
        filename: filename,
        filesize: filesize,
        type: "video",
        parent_id: projectId
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Kinescope API error status:", response.status)
      console.error("Kinescope API error body:", JSON.stringify(errorData, null, 2))
      return NextResponse.json({ 
        success: false, 
        error: errorData.message || "Failed to initiate upload",
        details: errorData 
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({
      success: true,
      uploadUrl: data.data.endpoint,
      videoId: data.data.id
    })
  } catch (error: any) {
    console.error("Kinescope API route error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
