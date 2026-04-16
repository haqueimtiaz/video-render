const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const https = require("https");

const app = express();
app.use(express.json({ limit: "100mb" }));

app.get("/", (req, res) => {
  res.send("🚀 Video renderer running");
});


/*************************
RENDER VIDEO (MULTI SCENE)
*************************/
app.post("/render", async (req, res) => {
  try {
    const { images, audio } = req.body;

    if (!images || !audio || images.length === 0) {
      return res.status(400).send("Missing images or audio");
    }

    let segments = [];

    for (let i = 0; i < images.length; i++) {

      const imgPath = `img${i}.png`;
      const audioPath = `aud${i}.mp3`;
      const output = `seg${i}.mp4`;

      // 🖼 Save image
      fs.writeFileSync(imgPath, Buffer.from(images[i], "base64"));

      // 🔊 Download audio
      await download(audio[i], audioPath);

      // 🎬 Create animated video segment (ZOOM EFFECT)
      await run(`
        ffmpeg -y -loop 1 -i ${imgPath} -i ${audioPath} \
        -vf "zoompan=z='min(zoom+0.002,1.3)':d=125,scale=1080:1920" \
        -c:v libx264 -tune stillimage \
        -c:a aac -b:a 192k \
        -pix_fmt yuv420p -shortest ${output}
      `);

      segments.push(output);
    }

    // 📄 Create list file for merging
    fs.writeFileSync(
      "list.txt",
      segments.map(f => `file '${f}'`).join("\n")
    );

    // 🔗 Merge all segments
    await run(`ffmpeg -y -f concat -safe 0 -i list.txt -c copy final.mp4`);

    const video = fs.readFileSync("final.mp4");

    res.setHeader("Content-Type", "video/mp4");
    res.send(video);

  } catch (err) {
    console.error("❌ RENDER ERROR:", err);
    res.status(500).send("Error rendering video");
  }
});


/*************************
HELPER: RUN COMMAND
*************************/
function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("FFMPEG ERROR:", stderr);
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}


/*************************
HELPER: DOWNLOAD AUDIO
*************************/
function download(url, path) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path);

    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", (err) => {
      fs.unlink(path, () => {});
      reject(err);
    });
  });
}


/*************************
START SERVER
*************************/
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Server running on port " + PORT));
