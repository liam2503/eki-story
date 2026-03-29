import confirm2Audio from '../confirm2.ogg';
import returnAudio from '../return.ogg';

const confirmSound = new Audio(confirm2Audio);
const returnSound = new Audio(returnAudio);

confirmSound.preload = 'auto';
returnSound.preload = 'auto';

export function playConfirmSound() {
    if (localStorage.getItem('eki-sound') !== 'false') {
        confirmSound.currentTime = 0;
        confirmSound.play().catch(() => {});
    }
}

export function playReturnSound() {
    if (localStorage.getItem('eki-sound') !== 'false') {
        returnSound.currentTime = 0;
        returnSound.play().catch(() => {});
    }
}

