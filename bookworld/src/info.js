var popupDiv;

export function ShowInfoPopup() {
    if (popupDiv == null) {
        popupDiv = document.getElementById("infopopup")
    if(window.matchMedia("(pointer: coarse)").matches) {
        popupDiv.addEventListener("touchend", (e) => {
            if (e.target == popupDiv) {
                popupDiv.style.animationName = "split-effect-hide";
                setTimeout(()=>{
                    popupDiv.style.display = "none";
                },400)
            }
        })
    }
    else{
        popupDiv.addEventListener("click", (e) => {
            if (e.target == popupDiv) {
                popupDiv.style.animationName = "split-effect-hide";
                setTimeout(()=>{
                    popupDiv.style.display = "none";
                },800)
            }
        })
    }

    }
    popupDiv.style.animationName = "split-effect";
    popupDiv.style.display = "flex";
}