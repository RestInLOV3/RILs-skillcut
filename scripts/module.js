// 모듈 로딩 시 실행
Hooks.once('init', () => {
  console.log("My Slide Module loaded!");
});

// 모든 클라이언트에서 슬라이드 표시 함수
function slideInMultiple(selectedChars) {
  const gap = 20;
  const num = selectedChars.length;

  const oldContainer = document.getElementById("macro-slide-container");
  if (oldContainer) oldContainer.remove();

  const container = document.createElement("div");
  container.id = "macro-slide-container";
  container.style.position = "fixed";
  container.style.top = `calc(50% - ${(num - 1) * 8.3 + 4.15}% - ${(num - 1) * gap/2}px)`;
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
    img.style.transform = side === "left" ? "translate(-150%, -50%)" : "translate(150%, -50%)";

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

      setTimeout(() => img.style.opacity = "0", 3000);
      setTimeout(() => { img.remove(); style.remove(); }, 5000);
    }, 50);
  });

  setTimeout(() => {
    const container = document.getElementById("macro-slide-container");
    if (container) container.remove();
  }, 5000);
}

// Socket 이벤트
Hooks.once('socketlib.ready', () => {
  game.socket.on('module.my-slide-module', async (data) => {
    if (data.type === "showSlide") slideInMultiple(data.selectedChars);
  });
});

// UI 버튼 생성
Hooks.on('renderChatLog', (log, html, data) => {
  const btn = $(`<button class="my-slide-btn" title="슬라이드 실행">🖼️</button>`);
  html.find(".control-buttons").prepend(btn);

  btn.on("click", async () => {
    // 캐릭터 선택 다이얼로그
    const characters = game.settings.get("my-slide-module", "characters") || {};
    let charSide = {};
    Object.keys(characters).forEach(name => charSide[name] = null);

    let content = `<div style="display:flex; justify-content:space-between; width:300px;">`;
    ["left","right"].forEach(side=>{
      content += `<div style="text-align:center;"><h3>${side.toUpperCase()}</h3>`;
      Object.keys(characters).forEach(name=>{
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
      render: htmlEl => {
        htmlEl.find("input[type=checkbox]").each((i,input)=>{
          input.addEventListener("change",()=>{
            const side=input.dataset.side;
            const charName=input.dataset.char;
            const otherSide = side==="left"?"right":"left";
            if(input.checked){
              const otherInput = htmlEl.find(`input[data-side=${otherSide}][data-char="${charName}"]`)[0];
              if(otherInput) otherInput.checked=false;
              charSide[charName]=side;
            } else charSide[charName]=null;
          });
        });

        htmlEl.find("#done")[0].addEventListener("click",()=>{
          const selectedChars = Object.entries(charSide)
            .filter(([name, side])=>side)
            .map(([name, side])=>({ imgPath: characters[name], side }));

          if(selectedChars.length===0){
            ui.notifications.warn("캐릭터를 하나 이상 선택해야 합니다.");
            return;
          }

          dlg.close();

          // Socket 호출
          game.socket.emit('module.my-slide-module', {
            type: "showSlide",
            selectedChars
          });
        });
      }
    });

    dlg.render(true);
  });
});
