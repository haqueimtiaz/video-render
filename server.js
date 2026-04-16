const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const https = require("https");

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/", (req, res) => {
  res.send("Video renderer running");
});

app.post("/render", async (req, res) => {
  try {
    const { images, audio } = req.body;

    // ✅ strict validation
    if (!images || images.length === 0 || !audio || audio.length === 0 || audio.some(a => !a)) {
      return res.status(400).send("Missing images or audio");
    }

    // save first image
    const imagePath = "image.png";
    fs.writeFileSync(imagePath, Buffer.from(images[0], "base64"));

    // download audio files
    const audioFiles = [];

    for (let i = 0; i < audio.length; i++) {
      const path = `audio${i}.mp3`;
      await download(audio[i], path);
      audioFiles.push(path);
    }

    // create list file
    fs.writeFileSync(
      "list.txt",
      audioFiles.map(f => `file '${f}'`).join("\n")
    );

    // merge audio
    await run(`ffmpeg -y -f concat -safe 0 -i list.txt -c copy output.mp3`);

    // create vertical short video (9:16)
    await run(`
      ffmpeg -y -loop 1 -i image.png -i output.mp3 \
      -vf "scale=1080:1920,format=yuv420p" \
      -c:v libx264 -preset veryfast \
      -c:a aac -b:a 192k \
      -shortest output.mp4
    `);

    const video = fs.readFileSync("output.mp4");

    res.setHeader("Content-Type", "video/mp4");
    res.send(video);

  } catch (err) {
    console.error(err);
    res.status(500).send("Render failed: " + err.message);
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
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path);
    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running"));
