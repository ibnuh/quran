<!doctype html>
<html lang="{{ app()->getLocale() }}">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title>Quran</title>

        <meta name="csrf-token" content="{{ csrf_token() }}">
        <link href="https://fonts.googleapis.com/css?family=Raleway:100,600" rel="stylesheet" type="text/css">
        <link rel="stylesheet" href="/css/app.css">
    </head>
    <body>
        <div id="app" class="full-height flex-center">
            <div class="top-right links">
                <a href="#" @click="manager().play()">PLAY</a>
                <a href="#" @click="manager().pause()">PAUSE</a>
                <a href="#">QURAN PROJECT</a>
            </div>
            <div class="content">
                <div class="hidden">
                    <div id="player"></div>
                </div>
                <template v-for="(verse, index) in verses">
                    <div class="text" v-if="isCurrent(index)">
                        <div class="verse">
                            @{{ verse.text_indopak }}
                        </div>
                        <div class="translation">
                            @{{ verse.translations[0].text }}
                        </div>
                    </div>
                </template>
            </div>
        </div>
        <script src="/js/app.js"></script>
    </body>
</html>
