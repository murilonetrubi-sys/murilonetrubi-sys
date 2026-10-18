const dialog = document.querySelector("#project-dialog");
let opener;
document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
    let visible = 0;
    document.querySelectorAll(".project").forEach((project) => {
      project.hidden = filter !== "all" && project.dataset.category !== filter;
      if (!project.hidden) visible++;
    });
    document.querySelector(".result-count").textContent =
      `${visible} ${visible === 1 ? "projeto" : "projetos"}`;
  });
});
document.querySelectorAll(".detail-button").forEach((button) => {
  button.addEventListener("click", () => {
    opener = button;
    document.querySelector("#dialog-title").textContent = button.dataset.title;
    document.querySelector("#dialog-detail").textContent =
      button.dataset.detail;
    document.querySelector("#dialog-case").href =
      `https://github.com/murilonetrubi-sys/murilonetrubi-sys/blob/main/portfolio/${button.dataset.slug}.md`;
    dialog.showModal();
  });
});
document
  .querySelector("#close-dialog")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => opener?.focus());
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  )
    dialog.close();
});
