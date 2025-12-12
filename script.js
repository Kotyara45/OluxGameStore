document.addEventListener('DOMContentLoaded', () => {
    const launchButton = document.getElementById('launch-button');
    const overlay = document.getElementById('prank-overlay');
    const prankText = document.getElementById('prank-text');
    const videoPlayer = document.getElementById('video-player');
    const finalVideoPlayer = document.getElementById('final-video-player');

    if (!launchButton) return; 

    launchButton.addEventListener('click', () => {
        overlay.classList.add('active');
        launchButton.style.display = 'none'; 

        videoPlayer.style.display = 'block';
        videoPlayer.play();

        videoPlayer.addEventListener('ended', () => {
            videoPlayer.style.display = 'none';
            prankText.style.display = 'block';

            prankText.textContent = 'Вітаємо!';
            
            setTimeout(() => {
                prankText.textContent = 'Дякую, що вибрали наш магазин OluxGameStore';
            }, 3000); 

            setTimeout(() => {
                prankText.textContent = 'Ха-ха! Ми просто хотіли, щоб ви зачекали. ми отримали всі ваші данні, OLUX BAY BAY.';
            }, 9000); 

            setTimeout(() => {
                prankText.style.display = 'none';

                finalVideoPlayer.style.display = 'block';
                finalVideoPlayer.play();
            }, 14000); 
        });
    });
});
