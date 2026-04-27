interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export async function uploadToGitHub(file: File, fileName: string, folder = "models"): Promise<UploadResult> {
  try {
    const token = (process.env.NEXT_PUBLIC_GITHUB_TOKEN || "").trim()
    const owner = (process.env.NEXT_PUBLIC_GITHUB_OWNER || "abdiaxatov").trim()
    const repo = (process.env.NEXT_PUBLIC_GITHUB_REPO || "3d_menyu").trim()

    if (!token) {
      return { success: false, error: "GitHub token not configured" }
    }

    // Use FileReader to avoid stack overflow
    const base64Content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix (data:*/*;base64,)
        const base64 = result.split(",")[1]
        resolve(base64)
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })

    const path = `${folder}/${fileName}`
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: `Add ${folder}: ${fileName}`,
        content: base64Content,
        // Omit branch to use default branch
      }),
    })

    if (!response.ok) {
      let errorMsg = `Upload failed with status: ${response.status}`
      try {
        const errorData = await response.json()
        console.error("GitHub API error response:", errorData)
        errorMsg = errorData.message || errorMsg
      } catch (e) {
        const errorText = await response.text()
        console.error("GitHub API error text:", errorText)
        errorMsg = errorText || errorMsg
      }
      return { success: false, error: errorMsg }
    }

    // Default branch name for the download URL (fallback to main if unknown)
    const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`
    return { success: true, url: downloadUrl }
  } catch (error) {
    console.error("GitHub upload error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
