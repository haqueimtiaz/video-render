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
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    // Download images
    for (let i = 0; i < frames.length; i++) {
      const url = frames[i];
      const filePath = path.join(tempDir, `frame${i}.png`);

      const response = await axios({
        url,
        method: "GET",
        responseType: "arraybuffer",
      });

      fs.writeFileSync(filePath, response.data);
    }

    const output = path.join(__dirname, "output.mp4");

    // FFmpeg command
    const cmd = `
    ffmpeg -y -framerate 1 -i ${tempDir}/frame%d.png \
    -c:v libx264 -r 30 -pix_fmt yuv420p ${output}
    `;

    exec(cmd, (err) => {
      if (err) {
        console.log(err);
        return res.status(500).send("FFmpeg failed");
      }

      const video = fs.readFileSync(output);
      res.set("Content-Type", "video/mp4");
      res.send(video);
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

app.get("/", (req,res)=>{
  res.send("Video renderer running");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
