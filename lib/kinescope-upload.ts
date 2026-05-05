interface KinescopeUploadResult {
  success: boolean
  url?: string
  videoId?: string
  error?: string
}

export async function uploadToKinescope(
  file: File, 
  title: string, 
  onProgress?: (percent: number) => void
): Promise<KinescopeUploadResult> {
  try {
    // 1. Get upload URL from our server
    const response = await fetch("/api/kinescope/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title,
        filename: file.name,
        filesize: file.size,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      const errorMessage = errorData.error || (errorData.details?.message) || "Failed to get upload link"
      return { success: false, error: errorMessage }
    }

    const { uploadUrl, videoId } = await response.json()

    // 2. Upload file using XMLHttpRequest to track progress
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open("POST", uploadUrl);
      
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(Math.round(percentComplete));
          }
        };
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ 
            success: true, 
            url: `https://kinescope.io/${videoId}`,
            videoId: videoId 
          });
        } else {
          resolve({ success: false, error: "Failed to upload video file" });
        }
      };
      
      xhr.onerror = () => {
        resolve({ success: false, error: "Network error during upload" });
      };
      
      xhr.send(file);
    });

  } catch (error) {
    console.error("Kinescope upload error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
