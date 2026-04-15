const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const axios = require("axios");

const app = express();
app.use(express.json());

app.post("/render", async (req, res) => {
  try {
    const frames = req.body.frames;

    if (!frames || frames.length === 0) {
      return res.status(400).send("No frames provided");
    }

    const tempDir = path.join(__dirname, "frames");

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir);

    // Download images
    for (let i = 0; i < frames.length; i++) {
      const url = frames[i];

      const response = await axios({
        url,
        method: "GET",
        responseType: "arraybuffer",
      });

      fs.writeFileSync(`${tempDir}/frame${i}.png`, response.data);
    }

    const output = path.join(__dirname, "output.mp4");

    // FIXED FFmpeg COMMAND (important)
    const cmd = `
    ffmpeg -y -loop 1 -t 5 -i ${tempDir}/frame0.png \
    -vf "scale=1080:1920,format=yuv420p" \
    -c:v libx264 -pix_fmt yuv420p ${output}
    `;

    exec(cmd, (err) => {
      if (err) {
        console.log("FFmpeg error:", err);
        return res.status(500).send("FFmpeg failed");
      }

      const video = fs.readFileSync(output);
      res.set("Content-Type", "video/mp4");
      res.send(video);
    });

  } catch (err) {
    console.log("Server error:", err);
    res.status(500).send("Server error");
  }
});

app.get("/", (req,res)=>{
  res.send("Video renderer running");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running"));
