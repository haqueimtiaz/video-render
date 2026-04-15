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
    const { image } = req.body;

    if (!image) {
      return res.status(400).send("No image provided");
    }

    const imagePath = "/tmp/frame0.png";
    const buffer = Buffer.from(image, "base64");

    fs.writeFileSync(imagePath, buffer);

    const output = "/tmp/output.mp4";

    const command = `
ffmpeg -y -loop 1 -i ${imagePath} \
-c:v libx264 \
-t 5 \
-pix_fmt yuv420p \
-vf "scale=720:1280" \
${output}
`;

    execSync(command);

    const videoBuffer = fs.readFileSync(output);

    res.setHeader("Content-Type", "video/mp4");
    res.send(videoBuffer);

    fs.unlinkSync(imagePath);
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
