import Player from 'aplayer'
import 'aplayer/dist/APlayer.min.css';


window.vue = new Vue({
    el: '#app',
    data: {
        player: null,
        audio: [],
        verses: [],
        active: [],
        current: 0
    },
    mounted() {
        axios.get('/sample/grab.json')
            .then(res => {
                this.verses = res.data
            })
            .then(res => {
                this.count();
            });
    },
    methods: {
        isCurrent(index){
            return (index + 1) == this.current;
        },
        initPlayer(){
            this.player = new Player({
                container: document.getElementById('player'),
                mini: false,
                autoplay: true,
                theme: '#FADFA3',
                loop: 'all',
                preload: 'auto',
                volume: 1,
                mutex: true,
                listFolded: false,
                listMaxHeight: 90,
                audio: this.audio
            })

            this.player.on('durationchange', () => {
                console.log(this.player.audio.duration);
                this.current++;
            })
        },
        count() {
            this.verses.map(verse => {
                this.audio.push({
                    name: 'Surah ' + verse.verse_number,
                    artist: 'Al-Waqiah',
                    url: 'https://verses.quran.com/' + verse.audio.url.slice(6),
                })
            });

            this.initPlayer()

            console.log(this.duration);
            console.log(this.player.audio.duration);
        },
        manager(){
            return this.player.audio;
        }
    }
})
