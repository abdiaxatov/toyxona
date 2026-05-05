const token = "d8ac7e05-4df2-4cc4-b986-283863955de8";

async function testKinescope() {
  try {
    const response = await fetch("https://api.kinescope.io/v1/videos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Test Video",
        filename: "test.mp4",
      }),
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testKinescope();
