<?php
    $uploads_dir = '/home/ronald/audiotest/wav';
    $upfile_size_limit = 3000000;

    header("Cache-control: private");
    header("Content-Type: text/plain");

    $upfile_name = basename($_FILES['file']['name']);
    # Ensure filename is of the pattern:
    # {subject number}_{stimulus number}_{repetition number}.wav
    # where
    #     {subject number} is a 1-6 digit number
    #     {stimulus number} is a 1-3 digit number
    #     {repetition number} is a 1-2 digit number
    if (! preg_match('/^\d{1,6}_\d{1,3}_\d{1,2}\.wav$/', $upfile_name) ) {
        error_log("ERROR - invalid filename!" . $upfile_name); 
        exit();
    }

    $fromFile = $_FILES['file']['tmp_name'];
    $toFile = $uploads_dir . '/' . $upfile_name;
    if ($_FILES['file']['size'] <= $upfile_size_limit) {
        $moveResult = move_uploaded_file( $fromFile, $toFile );
        if( $moveResult )
        {
            error_log("SUCCESS - move_uploaded_file( ) succeeded!"); 
        }
        else
        {
            error_log("ERROR - move_uploaded_file( ) failed!"); 
        }
    } else {
        error_log("ERROR - uploaded file too large!"); 
    }
?>
