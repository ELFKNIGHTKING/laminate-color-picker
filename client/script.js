document.addEventListener("DOMContentLoaded", () => {
  const imageInput = document.getElementById("imageInput");
  const previewImage = document.getElementById("previewImage");
  const colorButtonsContainer = document.getElementById("colorButtons");
  const resultsContainer = document.getElementById("results");

  imageInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      previewImage.src = e.target.result;
    };
    reader.readAsDataURL(file);

    previewImage.onload = async () => {
      const colorThief = new ColorThief();
      const dominantColors = colorThief.getPalette(previewImage, 4);
      colorButtonsContainer.innerHTML = "";

      const eyedropperBtn = document.getElementById("eyedropperButton");

      if ("EyeDropper" in window) {
        eyedropperBtn.addEventListener("click", async () => {
          const eyeDropper = new EyeDropper();
          try {
            const result = await eyeDropper.open();
            const pickedColor = result.sRGBHex;
            console.log("User picked:", pickedColor);
            handleColorClick(pickedColor); // trigger same function as other buttons
          } catch (err) {
            console.error("Eyedropper cancelled or failed:", err);
          }
        });
      } else {
        eyedropperBtn.disabled = true;
        eyedropperBtn.title = "Eyedropper not supported in this browser";
      }

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
  });

  document.getElementById("imageInput").addEventListener("change", function () {
    const instructionSection = document.getElementById("instructionSection");
    const previewContainer = document.getElementById("previewContainer");
  
    if (this.files && this.files.length > 0) {
      instructionSection.style.display = "none";      // Hide instructions
      previewContainer.style.display = "block";       // Show preview section
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
        `http://localhost:3001/api/laminates/similar?color=${encodeURIComponent(
          hex
        )}`
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
      img.src = `http://localhost:3001${laminate.image_path}`;
      img.alt = "Laminate";
      img.className = "laminate-img";

      const info = document.createElement("div");
      info.innerHTML = `
  <p><strong>Hex:</strong> ${laminate.hex_color}</p>
  <p><strong>Similarity:</strong> ${laminate.similarity}%</p>
  <div class="similarity-bar-wrapper">
    <div class="similarity-bar" style="background-color: ${laminate.hex_color}; width: ${laminate.similarity}%;">
      <span class="similarity-label">${laminate.similarity}%</span>
    </div>
  </div>
`;

      

      card.appendChild(img);
      card.appendChild(info);
      resultsContainer.appendChild(card);
    });
  }
});
