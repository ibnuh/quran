<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class GrabberController extends Controller
{
    public function count(){
        $url = "http://staging.quran.com:3000/api/v3/chapters/56/verses?recitation=3&translations=33&language=id&text_type=text";
        $data = $this->get($url);
        $meta = $data->meta;
        $verses = $data->verses;
        $meta->current_page++;

        for($meta->current_page;$meta->current_page <= $meta->total_pages;$meta->current_page++){
            $data = $this->get($url . '&page=' . $meta->current_page);
            $verses = array_merge((array) $verses, (array) $data->verses);
            dump($meta->current_page);
        }

        return $verses;
    }

    public function get($url){
        return json_decode(file_get_contents($url));
    }
}
