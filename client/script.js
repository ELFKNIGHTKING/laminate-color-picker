document.addEventListener("DOMContentLoaded", () => {
  const imageInput = document.getElementById("imageInput");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const pickModeBtn = document.getElementById("enablePickMode");
  const colorButtonsContainer = document.getElementById("colorButtons");
  const resultsContainer = document.getElementById("results");

  let pickMode = false;

  // Create the color preview box
  const colorPreview = document.createElement('div');
  colorPreview.id = 'colorPreview';
  colorPreview.style.display = 'none';
  document.body.appendChild(colorPreview);

  imageInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = async () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const colorThief = new ColorThief();
      const dominantColors = colorThief.getPalette(img, 4);
      colorButtonsContainer.innerHTML = "";

      dominantColors.forEach((rgbArray) => {
        const hex = rgbToHex(rgbArray[0], rgbArray[1], rgbArray[2]);
        const btn = document.createElement("button");
        btn.classList.add("color-btn", "color-circle");
        btn.style.backgroundColor = hex;
        btn.setAttribute("data-color", hex);
        btn.onclick = () => handleColorClick(hex);
        colorButtonsContainer.appendChild(btn);
      });
    };
    img.src = URL.createObjectURL(file);
  });

  pickModeBtn.addEventListener("click", () => {
    pickMode = true;
    pickModeBtn.textContent = "Tap on image to pick a color";
    pickModeBtn.disabled = true;

    canvas.classList.add("cursor-active");
  });

  // Function to update the color preview box on hover (only in pick mode)
  function updateColorPreview(event) {
    if (!pickMode) return;

    const canvasRect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - canvasRect.left;
    const mouseY = event.clientY - canvasRect.top;

    const imageData = ctx.getImageData(mouseX, mouseY, 1, 1);
    const pixel = imageData.data;

    const rgba = `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3] / 255})`;
    colorPreview.style.backgroundColor = rgba;

    colorPreview.style.left = `${event.pageX + 10}px`;
    colorPreview.style.top = `${event.pageY + 10}px`;
    colorPreview.style.display = 'block';
  }

  canvas.addEventListener("mousemove", updateColorPreview);

  canvas.addEventListener("mouseleave", () => {
    colorPreview.style.display = 'none';
  });

  canvas.addEventListener("click", function (event) {
    if (!pickMode) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    handleColorClick(hex);

    pickMode = false;
    pickModeBtn.innerHTML = '<img src="images/pick me.png" alt="Pick Color" class="button-icon" />';
    pickModeBtn.disabled = false;
    canvas.classList.remove("cursor-active");
    colorPreview.style.display = 'none';
  });

  document.getElementById("imageInput").addEventListener("change", function () {
    const instructionSection = document.getElementById("instructionSection");
    const previewContainer = document.getElementById("previewContainer");

    if (this.files && this.files.length > 0) {
      instructionSection.style.display = "none";
      previewContainer.style.display = "block";
    }
  });

  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }

  async function handleColorClick(hex) {
    if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      console.error("Invalid hex color:", hex);
      return;
    }

    resultsContainer.innerHTML = "<p>Loading similar laminates...</p>";

    try {
      const response = await fetch(
        `https://laminate-api.onrender.com/api/laminates/similar?color=${encodeURIComponent(hex)}`
      );

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      renderLaminates(data);
    } catch (err) {
      console.error("Error fetching laminates:", err);
      resultsContainer.innerHTML = `<p>Error fetching similar laminates.</p>`;
    }
  }

  function renderLaminates(laminates) {
    resultsContainer.innerHTML = "";

    if (!laminates.length) {
      resultsContainer.innerHTML = "<p>No similar laminates found.</p>";
      return;
    }

    laminates.forEach((laminate) => {
      const card = document.createElement("div");
      card.className = "laminate-card";

      const img = document.createElement("img");
      img.src = `https://laminate-api.onrender.com${laminate.image_path}`;
      img.alt = "Laminate";
      img.className = "laminate-img";

      const info = document.createElement("div");
      info.innerHTML = `
        <p><strong>Hex:</strong> ${laminate.hex_color}</p>
        <p><strong>Similarity:</strong> ${laminate.similarity}%</p>
        <div class="similarity-bar-wrapper">
          <div class="similarity-bar" style="background-color: ${laminate.hex_color}; width: ${laminate.similarity}%;"><span class="similarity-label">${laminate.similarity}%</span></div>
        </div>
      `;

      card.appendChild(img);
      card.appendChild(info);
      resultsContainer.appendChild(card);
    });
  }
});
