$("document").ready(function() {
    var socket = io.connect();
    var $messageForm = $("#messageForm");
    var $message = $("#message");
    var $chat = $("#chat");
    var $userFormArea = $("#userFormArea");
    var $username = $("#username");
    var $userForm = $("#userForm");
    var $messageArea = $("#messageArea");
    var $users = $("#users");

    $("#chatMessage").mCustomScrollbar({
        theme: "dark-3"
    });


    $("#messageArea").on("click", "li.cursor", function() {
        $(".chat").show();
        $("#refUser").text($(this).data("name"));
        $("#refUser").attr("data-id", $(this).data("id"));

        var data = {
            currentUser: $("#loginUser").data("id"),
            refUser: $(this).data("id")
        }
        $(".onlieUser>ul>li").removeClass("active");
        $(this).addClass("active").removeAttr("data-badge");
        $('.mCSB_container').html('');
        $.ajax({
                method: "Post",
                url: "/data/getchat",
                data: { user: data }
            })
            .done(function(data) {

                if (data != null && data.length > 0) {
                    $.each(data, function(index, value) {
                        writeChat(value, false);
                        updateScrollbar();
                    });
                }
            })
            .fail(function() {
                console.log("Error in chat result:");
            })
            .always(function() {});
        // updateScrollbar();
    });

    $('.enterChat').on('keydown', function(e) {
        if (e.which == 13) {
            e.preventDefault();
            var text = $(this).val();
            sendMessage(text);
            $(this).val('');
        }
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    $("#btnSpeech").on('click', () => {
        $("#btnSpeech").addClass("speech");
        recognition.start();
    });

    recognition.addEventListener('result', (e) => {
        let last = e.results.length - 1;
        let text = e.results[last][0].transcript;
        sendMessage(text);
    });

    recognition.addEventListener('speechend', () => {
        recognition.stop();
    });

    recognition.addEventListener('error', (e) => {
        $("#btnSpeech").removeClass("speech");
    });

    $messageForm.submit(function(e) {
        e.preventDefault();
        // recognition.start();
        socket.emit("send message", $message.val());
        $message.val('');
    });

    $userForm.submit(function(e) {
        e.preventDefault();
        socket.emit("new user", $username.val(), function(data) {
            if (data.isvalid) {
                $("#loginUser").text(data.username);
                $("#loginUser").attr("data-id", data.userID);
                $userFormArea.hide();
                $messageArea.show();
                $(".welcome").show();
            }
        });
        $username.val('');
    });

    function synthVoice(text) {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance();
        utterance.text = text;
        synth.speak(utterance);
    }

    function updateScrollbar() {
        $("#chatMessage").mCustomScrollbar("scrollTo", "bottom");
    }

    socket.on("new message", function(data) {
        writeChat(data, true);
        // $chat.append('<div class="well"><strong>' + data.user + '</strong> : ' + data.msg + '</div>');
    });

    var writeChat = (data, speak) => {

        $("#btnSpeech").removeClass("speech");
        var IsCurrentUser = data.user == $("#loginUser").text() ? true : false;
        var selectedUser = $(".onlieUser>ul").find("li.active").data("name");
        if (IsCurrentUser) {
            console.log("don't speek");
            $('<div class="message message-personal">' + data.text + '</div>').appendTo($('.mCSB_container')).addClass('new');
        } else {
            var showMsgCount = data.user == selectedUser ? false : true;
            if (showMsgCount) {
                var value = $("#" + data.id + "").data("badge");
                value = value != null || value != undefined ? parseInt(value) : 0;
                $("#" + data.id + "").attr("data-badge", ++value);
            } else {
                console.log("speek");
                if (speak)
                    synthVoice(data.text);
                $('<div class="message new"><figure class="avatar"><span>' + data.user + '</span></figure>' + data.text + '</div>').appendTo($('.mCSB_container')).addClass('new');
            }
        }
        updateScrollbar();

    };

    var sendMessage = (text) => {

        var data = {
            text: text,
            currentUser: $("#loginUser").text(),
            currentUserID: $("#loginUser").data("id"),
            refUser: $("#refUser").text(),
            refUserID: $("#refUser").data("id")
        };
        socket.emit("send message", data);
    };

    socket.on("get users", function(data) {
        var html = '';

        data = data.filter(function(user) {
            return user.username != $("#loginUser").text();
        });

        if (data.length > 0) {
            for (i = 0; i < data.length; i++) {
                html += '<li class="cursor badge1"  id=' + data[i].userID + ' data-id=' + data[i].userID + ' data-name=' + data[i].username +
                    '><i class=" fa-li fa fa-user-circle fa-2x"></i>' +
                    data[i].username + '</li>';
            }

            $users.html(html);
        } else
            $users.html('<li class="noCursor" > No one is online </li>');
    });
});