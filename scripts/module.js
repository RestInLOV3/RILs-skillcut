// ----------------------------
// 캐릭터 매핑 저장
// ----------------------------
Hooks.once("init", () => {
  console.log("RILs Skillcut Module loaded!");

  game.settings.register("RILs-skillcut", "characters", {
    name: "캐릭터 이미지 매핑",
    scope: "world",
    config: false,
    type: Object,
    default: {},
  });

  game.settings.registerMenu("RILs-skillcut", "charactersMenu", {
    name: "캐릭터 매핑 편집",
    label: "편집하기",
    hint: "캐릭터 이름 ↔ 이미지 경로 매핑을 행 단위로 편집합니다.",
    icon: "fas fa-user-edit",
    type: CharacterMappingForm,
    restricted: true,
  });
});

// ----------------------------
// FormApplication 정의
// ----------------------------
class CharacterMappingForm extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "캐릭터 이미지 매핑 편집",
      id: "character-mapping-form",
      template: "modules/RILs-skillcut/templates/character-mapping.html",
      width: 600,
      height: "auto",
      closeOnSubmit: true,
    });
  }

  getData() {
    const characters = game.settings.get("RILs-skillcut", "characters") || {};
    return {
      characters: Object.entries(characters).map(([name, img]) => ({
        name,
        img,
      })),
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("#add-row").click(() => {
      const newRow = $(`
        <tr>
          <td><input type="text" class="char-name" placeholder="캐릭터 이름"></td>
          <td><input type="text" class="char-img" placeholder="이미지 경로"></td>
          <td><button type="button" class="delete-row">❌</button></td>
        </tr>
      `);
      html.find("tbody").append(newRow);
      newRow
        .find(".delete-row")
        .click((ev) => $(ev.currentTarget).closest("tr").remove());
    });

    html
      .find(".delete-row")
      .click((ev) => $(ev.currentTarget).closest("tr").remove());
  }

  async _updateObject(event, formData) {
    const html = this.element;
    const newData = {};
    html.find("tbody tr").each((i, row) => {
      const name = row.querySelector(".char-name").value.trim();
      const img = row.querySelector(".char-img").value.trim();
      if (name && img) newData[name] = img;
    });
    await game.settings.set("RILs-skillcut", "characters", newData);
    ui.notifications.info("캐릭터 매핑이 저장되었습니다!");
  }
}

// ----------------------------
// SocketLib 등록 및 슬라이드 함수 등록
// ----------------------------
let socket;

Hooks.once("socketlib.ready", () => {
  socket = socketlib.registerModule("RILs-skillcut");
  socket.register("showSlide", (selectedChars) =>
    slideInMultiple(selectedChars)
  );
});

Hooks.once("ready", () => {
  const tryCreateButton = () => {
    const controls = document.querySelector("#chat-controls .control-buttons");
    if (!controls) return setTimeout(tryCreateButton, 500); // DOM 아직 없으면 재시도
    createSlideButton();
  };
  tryCreateButton();
});

// ----------------------------
// 슬라이드 표시 함수
// ----------------------------
function slideInMultiple(selectedChars) {
  const gap = 20;
  const num = selectedChars.length;

  const oldContainer = document.getElementById("macro-slide-container");
  if (oldContainer) oldContainer.remove();

  const container = document.createElement("div");
  container.id = "macro-slide-container";
  container.style.position = "fixed";
  container.style.top = "50%";
  container.style.left = "0";
  container.style.width = "100%";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.justifyContent = "center";
  container.style.alignItems = "center";
  container.style.rowGap = `${gap}px`;
  container.style.zIndex = 9999;
  document.body.appendChild(container);

  selectedChars.forEach(({ imgPath, side }) => {
    const img = document.createElement("img");
    img.src = imgPath;
    img.style.width = "auto";
    img.style.height = "80%";
    img.style.objectFit = "contain";
    img.style.opacity = "1";
    img.style.clipPath = "inset(49% 0 49% 0)";
    img.style.transition = "opacity 2s ease-out, transform 0.7s ease-in-out";
    img.style.transform =
      side === "left" ? "translate(-150%, -50%)" : "translate(150%, -50%)";
    container.appendChild(img);

    setTimeout(() => {
      img.style.transform = "translate(0%, -50%)";

      const style = document.createElement("style");
      style.innerHTML = `
        @keyframes clipGrow {
          0% { clip-path: inset(49% 0 49% 0); }
          100% { clip-path: inset(0 0 0 0); }
        }
        img[src='${imgPath}'] {
          animation: clipGrow 1s cubic-bezier(0.8,0,0.2,1) 1s forwards;
        }`;
      document.head.appendChild(style);

      setTimeout(() => (img.style.opacity = "0"), 3000);
      setTimeout(() => {
        img.remove();
        style.remove();
      }, 5000);
    }, 50);
  });

  setTimeout(() => {
    const container = document.getElementById("macro-slide-container");
    if (container) container.remove();
  }, 5000);
}

// ----------------------------
// 슬라이드 버튼 생성
// ----------------------------
function createSlideButton() {
  if (document.querySelector("#chat-controls .control-buttons .fa-star"))
    return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ui-control icon fa-solid fa-star";
  btn.setAttribute("data-tooltip", "스킬컷");
  btn.setAttribute("aria-label", "스킬컷");

  btn.addEventListener("click", () => {
    const characters = game.settings.get("RILs-skillcut", "characters") || {};
    let charSide = {};
    Object.keys(characters).forEach((name) => (charSide[name] = null));

    let content = `<div style="display:flex; justify-content:space-between; width:300px;">`;
    ["left", "right"].forEach((side) => {
      content += `<div style="text-align:center;"><h3>${side.toUpperCase()}</h3>`;
      Object.keys(characters).forEach((name) => {
        content += `<label>
          <input type="checkbox" data-side="${side}" data-char="${name}"> ${name}
        </label><br>`;
      });
      content += `</div>`;
    });
    content += `</div><div style="text-align:center; margin-top:10px;">
      <button id="done">선택 완료</button>
    </div>`;

    const dlg = new Dialog({
      title: "캐릭터 선택",
      content,
      buttons: {},
      render: (htmlEl) => {
        htmlEl.find("input[type=checkbox]").each((i, input) => {
          input.addEventListener("change", () => {
            const side = input.dataset.side;
            const charName = input.dataset.char;
            const otherSide = side === "left" ? "right" : "left";
            if (input.checked) {
              const otherInput = htmlEl.find(
                `input[data-side=${otherSide}][data-char="${charName}"]`
              )[0];
              if (otherInput) otherInput.checked = false;
              charSide[charName] = side;
            } else charSide[charName] = null;
          });
        });

        htmlEl.find("#done")[0].addEventListener("click", () => {
          const selectedChars = Object.entries(charSide)
            .filter(([name, side]) => side)
            .map(([name, side]) => ({ imgPath: characters[name], side }));

          if (selectedChars.length === 0) {
            ui.notifications.warn("캐릭터를 하나 이상 선택해야 합니다.");
            return;
          }

          dlg.close();

          // 모든 클라이언트에서 슬라이드 실행
          if (socket) {
            socket.executeForEveryone("showSlide", selectedChars);
          } else {
            ui.notifications.error("SocketLib가 준비되지 않았습니다.");
          }
        });
      },
    });

    dlg.render(true);
  });

  const controls = document.querySelector("#chat-controls .control-buttons");
  if (controls) controls.prepend(btn);
}
