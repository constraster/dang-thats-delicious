import axios from 'axios';
import {$} from './bling';

function ajaxHeart(e) {
    e.preventDefault(); //stop form from posting itself
    //use js to handle
    axios
        .post(this.action)
        .then(res => {
            //access heart name attr and toggle class
            const isHearted = this.heart.classList.toggle('heart__button--hearted')
            $('.heart-count').textContent = res.data.hearts.length;
            if(isHearted) {
                this.heart.classList.add('heart__button--float');
                setTimeout(() => this.heart.classList.remove('heart__button--float'), 2500);
            }
        });
}

export default ajaxHeart;