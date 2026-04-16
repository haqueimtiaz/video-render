const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const https = require("https");

const app = express();
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Video renderer running");
});

app.post("/render", async (req, res) => {
  try {
    const { image, audio } = req.body;

    if (!image || !audio || audio.length === 0) {
      return res.status(400).send("Missing image or audio");
    }

    // 🖼️ Save image
    const imagePath = "image.png";
    fs.writeFileSync(imagePath, Buffer.from(image, "base64"));

    // 🔊 Download audio files
    const audioFiles = [];

    for (let i = 0; i < audio.length; i++) {
      const path = `audio${i}.mp3`;
      await download(audio[i], path);
      audioFiles.push(path);
    }

    // 📄 Create list file for FFmpeg
    const listFile = "list.txt";
    fs.writeFileSync(
      listFile,
      audioFiles.map(f => `file '${f}'`).join("\n")
    );

    // 🔊 Merge audio
    await run(`ffmpeg -y -f concat -safe 0 -i list.txt -c copy output.mp3`);

    // 🎬 CREATE SHORTS VIDEO (VERTICAL)
    await run(`
      ffmpeg -y -loop 1 -i image.png -i output.mp3 \
      -vf "scale=1080:-1,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p" \
      -c:v libx264 -tune stillimage \
      -c:a aac -b:a 192k \
      -shortest -r 30 output.mp4
    `);

    // 📦 Read video
    const video = fs.readFileSync("output.mp4");

    res.setHeader("Content-Type", "video/mp4");
    res.send(video);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error rendering video");
  }
});

// 🔧 Run shell command
function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr);
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}

// 🔽 Download helper
function download(url, path) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path);
    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", (err) => {
      fs.unlink(path, () => reject(err));
    });
  });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Server running on port " + PORT));
