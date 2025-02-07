<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // Coletar dados do form
    $nome = htmlspecialchars($_POST['nome']);
    $email = htmlspecialchars($_POST['email']);
    $mensagem = htmlspecialchars($_POST['mensagem']);

    // Configurações do email
    $to = "contato@bigdooh.com.br"; 
    $subject = "Nova mensagem de contato de $nome";
    $body = "Nome: $nome\nEmail: $email\nMensagem:\n$mensagem";
    $headers = "From: $email";

    // Enviar email
    if (mail($to, $subject, $body, $headers)) {
        echo "Mensagem enviada com sucesso!";
    } else {
        echo "Falha ao enviar a mensagem.";
    }
}
?>