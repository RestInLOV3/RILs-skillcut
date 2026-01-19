/**
 * RILs Skillcut Module
 * FVTT 13 / DnD 5e용 스킬컷 연출 모듈
 */

const MODULE_ID = "RILs-skillcut";

// ===========================================
// 슬라이드 매니저
// ===========================================
class SkillcutSlideManager {
  static CONTAINER_ID = "skillcut-container";
  static IMAGE_GAP = 20;
  static TIMINGS = {
    slideIn: 50,
    fadeOut: 3000,
    cleanup: 5000,
  };

  /**
   * 여러 캐릭터의 슬라이드 이미지를 표시
   * @param {Array<{imgPath: string, side: 'left'|'right'}>} selectedChars
   */
  static show(selectedChars) {
    this.#removeExistingContainer();
    const container = this.#createContainer();

    selectedChars.forEach(({ imgPath, side }) => {
      const img = this.#createSlideImage(imgPath, side);
      container.appendChild(img);
      this.#animateImage(img);
    });

    this.#scheduleCleanup();
  }

  static #removeExistingContainer() {
    document.getElementById(this.CONTAINER_ID)?.remove();
  }

  static #createContainer() {
    const container = document.createElement("div");
    container.id = this.CONTAINER_ID;
    container.style.gap = `${this.IMAGE_GAP}px`;
    document.body.appendChild(container);
    return container;
  }

  static #createSlideImage(imgPath, side) {
    const img = document.createElement("img");
    img.src = imgPath;
    img.className = `skillcut-image from-${side}`;
    return img;
  }

  static #animateImage(img) {
    setTimeout(() => {
      img.classList.add("visible", "expanding");

      setTimeout(() => img.classList.add("fade-out"), this.TIMINGS.fadeOut);
      setTimeout(() => img.remove(), this.TIMINGS.cleanup);
    }, this.TIMINGS.slideIn);
  }

  static #scheduleCleanup() {
    setTimeout(() => {
      document.getElementById(this.CONTAINER_ID)?.remove();
    }, this.TIMINGS.cleanup);
  }
}

// ===========================================
// 캐릭터 매핑 폼
// ===========================================
class CharacterMappingForm extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "캐릭터 이미지 매핑 편집",
      id: "character-mapping-form",
      template: `modules/${MODULE_ID}/templates/character-mapping.html`,
      width: 600,
      height: "auto",
      closeOnSubmit: true,
    });
  }

  getData() {
    const characters = game.settings.get(MODULE_ID, "characters") ?? {};
    return {
      characters: Object.entries(characters).map(([name, img]) => ({
        name,
        img,
      })),
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("#add-row").on("click", () => this.#addRow(html));
    html.find(".delete-row").on("click", (ev) => this.#deleteRow(ev));

    // 드래그 앤 드롭 설정
    this.#setupDragAndDrop(html);
  }

  #addRow(html) {
    const newRow = $(`
      <tr draggable="true">
        <td class="drag-handle"><i class="fas fa-grip-vertical"></i></td>
        <td><input type="text" class="char-name" placeholder="캐릭터 이름"></td>
        <td><input type="text" class="char-img" placeholder="이미지 경로"></td>
        <td><button type="button" class="delete-row"><i class="fas fa-trash"></i></button></td>
      </tr>
    `);
    html.find("tbody").append(newRow);
    newRow.find(".delete-row").on("click", (ev) => this.#deleteRow(ev));
    this.#setupRowDrag(newRow[0]);
    this.setPosition({ height: "auto" });
  }

  #deleteRow(ev) {
    $(ev.currentTarget).closest("tr").remove();
    this.setPosition({ height: "auto" });
  }

  #setupDragAndDrop(html) {
    const rows = html.find("tbody tr");
    rows.each((_, row) => this.#setupRowDrag(row));
  }

  #setupRowDrag(row) {
    let draggedRow = null;

    row.addEventListener("dragstart", (e) => {
      draggedRow = row;
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
    });

    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      row.classList.add("drag-over");
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });

    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("drag-over");
      const dragging = document.querySelector(".dragging");
      if (dragging && dragging !== row) {
        const tbody = row.parentNode;
        const rows = Array.from(tbody.children);
        const dragIdx = rows.indexOf(dragging);
        const dropIdx = rows.indexOf(row);
        if (dragIdx < dropIdx) {
          tbody.insertBefore(dragging, row.nextSibling);
        } else {
          tbody.insertBefore(dragging, row);
        }
      }
    });
  }

  async _updateObject(event, formData) {
    const newData = {};
    this.element.find("tbody tr").each((_, row) => {
      const name = row.querySelector(".char-name").value.trim();
      const img = row.querySelector(".char-img").value.trim();
      if (name && img) {
        newData[name] = img;
      }
    });

    await game.settings.set(MODULE_ID, "characters", newData);
    ui.notifications.info("캐릭터 매핑이 저장되었습니다!");
  }
}

// ===========================================
// 캐릭터 선택 다이얼로그
// ===========================================
class CharacterSelectDialog {
  #characters;
  #charSide;
  #socket;

  constructor(characters, socket) {
    this.#characters = characters;
    this.#socket = socket;
    this.#charSide = {};
    Object.keys(characters).forEach((name) => (this.#charSide[name] = null));
  }

  render() {
    const content = this.#buildContent();

    new Dialog({
      title: "캐릭터 선택",
      content,
      buttons: {},
      render: (html) => this.#activateListeners(html),
    }).render(true);
  }

  #buildContent() {
    const charNames = Object.keys(this.#characters);

    const buildSide = (side) => {
      const checkboxes = charNames
        .map(
          (name) =>
            `<label><input type="checkbox" data-side="${side}" data-char="${name}"> ${name}</label>`
        )
        .join("");

      return `
        <div class="skillcut-dialog-side">
          <h3>${side.toUpperCase()}</h3>
          ${checkboxes}
        </div>
      `;
    };

    return `
      <div class="skillcut-dialog">
        ${buildSide("left")}
        ${buildSide("right")}
      </div>
      <div class="skillcut-dialog-footer">
        <button id="skillcut-confirm">선택 완료</button>
      </div>
    `;
  }

  #activateListeners(html) {
    html.find("input[type=checkbox]").on("change", (ev) => {
      this.#handleCheckboxChange(html, ev.currentTarget);
    });

    html.find("#skillcut-confirm").on("click", () => {
      this.#handleConfirm(html);
    });
  }

  #handleCheckboxChange(html, input) {
    const { side, char: charName } = input.dataset;
    const otherSide = side === "left" ? "right" : "left";

    if (input.checked) {
      // 반대쪽 체크 해제
      const otherInput = html.find(
        `input[data-side="${otherSide}"][data-char="${charName}"]`
      )[0];
      if (otherInput) otherInput.checked = false;
      this.#charSide[charName] = side;
    } else {
      this.#charSide[charName] = null;
    }
  }

  #handleConfirm(html) {
    const selectedChars = Object.entries(this.#charSide)
      .filter(([_, side]) => side !== null)
      .map(([name, side]) => ({
        imgPath: this.#characters[name],
        side,
      }));

    if (selectedChars.length === 0) {
      ui.notifications.warn("캐릭터를 하나 이상 선택해야 합니다.");
      return;
    }

    // 다이얼로그 닫기
    html.closest(".app").find(".close").trigger("click");

    // 모든 클라이언트에서 슬라이드 실행
    if (this.#socket) {
      this.#socket.executeForEveryone("showSlide", selectedChars);
    } else {
      ui.notifications.error("SocketLib가 준비되지 않았습니다.");
    }
  }
}

// ===========================================
// 스킬컷 버튼 매니저
// ===========================================
class SkillcutButton {
  static #socket = null;

  static setSocket(socket) {
    this.#socket = socket;
  }

  static create() {
    const controls = document.querySelector("#chat-controls .control-buttons");
    if (!controls) return false;

    // 중복 방지
    if (controls.querySelector(".skillcut-btn")) return true;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ui-control icon fa-solid fa-star skillcut-btn";
    btn.dataset.tooltip = "스킬컷";
    btn.setAttribute("aria-label", "스킬컷");

    btn.addEventListener("click", () => this.#onClick());
    controls.prepend(btn);
    return true;
  }

  static #onClick() {
    const characters = game.settings.get(MODULE_ID, "characters") ?? {};

    if (Object.keys(characters).length === 0) {
      ui.notifications.warn(
        "등록된 캐릭터가 없습니다. 모듈 설정에서 캐릭터를 추가하세요."
      );
      return;
    }

    new CharacterSelectDialog(characters, this.#socket).render();
  }
}

// ===========================================
// 모듈 초기화
// ===========================================
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | 모듈 초기화 중...`);

  // 캐릭터 매핑 저장소 등록
  game.settings.register(MODULE_ID, "characters", {
    name: "캐릭터 이미지 매핑",
    scope: "world",
    config: false,
    type: Object,
    default: {},
  });

  // 설정 메뉴 등록
  game.settings.registerMenu(MODULE_ID, "charactersMenu", {
    name: "캐릭터 매핑 편집",
    label: "편집하기",
    hint: "캐릭터 이름 ↔ 이미지 경로 매핑을 행 단위로 편집합니다.",
    icon: "fas fa-user-edit",
    type: CharacterMappingForm,
    restricted: true,
  });
});

// SocketLib 등록
Hooks.once("socketlib.ready", () => {
  const socket = socketlib.registerModule(MODULE_ID);
  socket.register("showSlide", (selectedChars) =>
    SkillcutSlideManager.show(selectedChars)
  );
  SkillcutButton.setSocket(socket);
});

// UI 준비 완료 후 버튼 생성
Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | 모듈 로드 완료!`);

  const tryCreateButton = () => {
    if (!SkillcutButton.create()) {
      setTimeout(tryCreateButton, 500);
    }
  };
  tryCreateButton();
});
