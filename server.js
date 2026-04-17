/*************************
FINAL RENDER SERVER (BASE64)
*************************/
const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/", (req, res) => {
  res.send("Video renderer running");
});

app.post("/render", async (req, res) => {
  try {

    const { images, audio } = req.body;

    if (!images || !audio || images.length === 0 || audio.length === 0) {
      return res.status(400).send("Missing images or audio");
    }

    // ✅ Save image
    fs.writeFileSync("image.png", Buffer.from(images[0], "base64"));

    // ✅ Save audio (BASE64 → FILE)
    const audioFiles = [];

    for (let i = 0; i < audio.length; i++) {
      const file = `audio${i}.mp3`;

      if (!audio[i] || audio[i].length < 1000) {
        throw new Error("Invalid audio data");
      }

      fs.writeFileSync(file, Buffer.from(audio[i], "base64"));
      audioFiles.push(file);
    }

    // merge audio
    fs.writeFileSync(
      "list.txt",
      audioFiles.map(f => `file '${f}'`).join("\n")
    );

    await run(`ffmpeg -y -f concat -safe 0 -i list.txt -c copy output.mp3`);

    // create video
    await run(`
      ffmpeg -y -loop 1 -i image.png -i output.mp3 \
      -vf "scale=1080:1920,format=yuv420p" \
      -c:v libx264 -preset ultrafast \
      -tune stillimage \
      -c:a aac -shortest output.mp4
    `);

    const video = fs.readFileSync("output.mp4");

    res.setHeader("Content-Type", "video/mp4");
    res.send(video);

  } catch (err) {
    console.error(err);
    res.status(500).send("Render failed: " + err.message);
  }
});

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running"));
