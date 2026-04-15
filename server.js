const express = require("express");
const axios = require("axios");
const fs = require("fs");
const { execSync } = require("child_process");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Video renderer running");
});

/***********************
VIDEO RENDER API
************************/
app.post("/render", async (req, res) => {
  try {
    const { frames } = req.body;

    if (!frames || frames.length === 0) {
      return res.status(400).send("No frames provided");
    }

    const tempFiles = [];

    // 🔽 DOWNLOAD IMAGES
    for (let i = 0; i < frames.length; i++) {
      const url = frames[i];

      const filePath = `/tmp/frame${i}.png`;

      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });

      fs.writeFileSync(filePath, response.data);
      tempFiles.push(filePath);
    }

    // 🔽 CREATE VIDEO USING FFMPEG
    const output = `/tmp/output.mp4`;

    const command = `
ffmpeg -y -framerate 1 \
-i /tmp/frame%d.png \
-c:v libx264 \
-pix_fmt yuv420p \
-vf "scale=720:1280,format=yuv420p" \
${output}
`;

    execSync(command);

    const videoBuffer = fs.readFileSync(output);

    res.setHeader("Content-Type", "video/mp4");
    res.send(videoBuffer);

    // 🔽 CLEANUP
    tempFiles.forEach(f => fs.unlinkSync(f));
    fs.unlinkSync(output);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error rendering video");
  }
});

/***********************
START SERVER
************************/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
