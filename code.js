window.addEventListener("load", () => {

    const REVEAL_TIME  = 2500;   

    const LOADING_TIME = 3500;   

    const curtain = document.getElementById("reveal-curtain");
    const loader  = document.getElementById("loader");
    const video   = loader.querySelector("video");

    setTimeout(() => {
        curtain.classList.add("up");
    }, 100); 

    setTimeout(() => {

        loader.classList.add("loader-hidden");

        if(video) video.pause();

    }, REVEAL_TIME + LOADING_TIME);
});