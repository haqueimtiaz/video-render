const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");

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

    // save image
    const imagePath = "image.png";
    fs.writeFileSync(imagePath, Buffer.from(image, "base64"));

    // download audio files
    const audioFiles = [];

    for (let i = 0; i < audio.length; i++) {
      const path = `audio${i}.mp3`;
      await download(audio[i], path);
      audioFiles.push(path);
    }

    // create list file for ffmpeg
    const listFile = "list.txt";
    fs.writeFileSync(
      listFile,
      audioFiles.map(f => `file '${f}'`).join("\n")
    );

    // merge audio
    await run(`ffmpeg -y -f concat -safe 0 -i list.txt -c copy output.mp3`);

    // create video
    await run(`
      ffmpeg -y -loop 1 -i image.png -i output.mp3 \
      -c:v libx264 -tune stillimage \
      -c:a aac -b:a 192k \
      -pix_fmt yuv420p -shortest output.mp4
    `);

    const video = fs.readFileSync("output.mp4");

    res.setHeader("Content-Type", "video/mp4");
    res.send(video);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error rendering video");
  }
});

// helpers
function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function download(url, path) {
  const https = require("https");
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path);
    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", reject);
  });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running"));
