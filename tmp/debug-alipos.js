const clientId = "937045c3-bd4f-431f-9f3e-0568f479d9c1";
const clientSecret = "8e10e2bb-68c7-45b1-8009-87b4eb8f26dc";
const baseUrl = "https://smart.alipos.uz";

async function test() {
  try {
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");

    console.log("--- TEST START ---");
    console.log("Fetching token from:", `${baseUrl}/security/oauth/token`);
    const response = await fetch(`${baseUrl}/security/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    if (!response.ok) {
        console.error("Auth failed:", response.status, await response.text());
        return;
    }

    const data = await response.json();
    console.log("Auth success! Token acquired.");
    
    console.log("Fetching restaurants from:", `${baseUrl}/restaurants`);
    const resResponse = await fetch(`${baseUrl}/restaurants`, {
        headers: { "Authorization": `Bearer ${data.access_token}` }
    });
    
    console.log("Restaurants response status:", resResponse.status);
    const resText = await resResponse.text();
    console.log("Raw response:", resText);

    try {
        const resData = JSON.parse(resText);
        console.log("Places found:", resData.places?.length || 0);
        if (resData.places) {
            resData.places.forEach(p => console.log(`- ${p.title} (${p.id})`));
        }
    } catch (e) {
        console.error("Failed to parse JSON response");
    }

  } catch (error) {
    console.error("Test error:", error);
  }
}

test();
