<?php
/*
header("Access-Control-Allow-Origin: *");
header('Content-Type: text/html; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST');
header("Access-Control-Allow-Headers: X-Requested-With");

mb_internal_encoding('UTF-8');
mb_http_output('UTF-8');
mb_http_input('UTF-8');
mb_regex_encoding('UTF-8'); 
try {
    $host = 'localhost';
    $db = 'dbname';
    $user = 'admin';
    $pass = 'password';
    $charset = 'utf8';
    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
    $opt = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, 
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, 
        PDO::ATTR_EMULATE_PREPARES => false
        ];
    $pdo = new PDO($dsn, $user, $pass);
} catch (PDOException $e) {
    die("DB connect error: " . $e->getMessage());
}
$_GET['q'] = (isset($_GET['q'])? $_GET['q']:'');
*/
//uncomment if you don't use core.php
include 'core.php';

if(!isset($_GET['v'])) return;
switch ($_GET['q']) {
    case 'login':
        try {
            $quer = $pdo->prepare('SELECT * from `login` WHERE `login` = ? AND `pass` = ?');
            $quer->execute(array(
                $_GET['login'],
                $_GET['pass']
            ));
            $res = $quer->fetchAll();
            if (count($res) < 1) {
                $quer = $pdo->prepare('INSERT INTO `login` (`login`, `pass`, `ip`, `time`) VALUES (?, ?, ?, "' . date('Y.m.d H:i:s') . '")');
                $quer->execute(array(
                    $_GET['login'],
                    $_GET['pass'],
                    $_SERVER['REMOTE_ADDR']
                ));
            }
            $quer = null;
        }
        catch (PDOException $e) {
            die("Error!: " . $e->getMessage() . "<br/>");
        }
        break;

    case 'answers':
        $tmpd = file_get_contents("php://input");
        $json = json_decode($tmpd, true);
        for ($i = 0; $i < count($json); $i++) {
            try {
                $quer = $pdo->prepare('SELECT * from `que` WHERE `name` = ?');
                $quer->execute(array(
                    filterQue($json[$i][0])
                ));
                $res = $quer->fetchAll();
                if (count($res) < 1) {
                    $pdo->beginTransaction();
                    $quer = $pdo->prepare('INSERT INTO `que` (`name`) VALUES (?)');
                    $quer->execute(array(
                        filterQue($json[$i][0])
                    ));
                    $queid = $pdo->lastInsertId();
                    $pdo->commit();
                } else {
                    $queid = $res[0]['id'];
                }
                
                //answers
                for ($j = 0; $j < count($json[$i][1]); $j++) {
                    $quer = $pdo->prepare('INSERT INTO `answ` (`name`, `qid`) SELECT ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM `answ` WHERE `name`=? AND `qid`=? LIMIT 1) ');
                    $quer->execute(array(
                        filterAnswer($json[$i][1][$j]),
                        $queid,
                        filterAnswer($json[$i][1][$j]),
                        $queid
                    ));
                }
                for ($j = 0; $j < count($json[$i][2]); $j++) {
                    $quer = $pdo->prepare('INSERT INTO `answ` (`name`, `qid`) SELECT ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM `answ` WHERE `name`=? AND `qid`=? LIMIT 1) ');
                    $quer->execute(array(
                        filterAnswer($json[$i][2][$j]),
                        $queid,
                        filterAnswer($json[$i][2][$j]),
                        $queid
                    ));
                    $quer = $pdo->prepare('UPDATE `answ` SET `right` = 1 WHERE `name`=? AND `qid`=?');
                    $quer->execute(array(
                        filterAnswer($json[$i][2][$j]),
                        $queid
                    ));
                }
                for ($j = 0; $j < count($json[$i][3]); $j++) {
                    $quer = $pdo->prepare('UPDATE `answ` SET `right` = 2 WHERE `name`=? AND `qid`=?');
                    $quer->execute(array(
                        filterAnswer($json[$i][3][$j]),
                        $queid
                    ));
                }
                $quer = null;
            }
            catch (PDOException $e) {
                $pdo->rollback();
                die("Error!: " . $e->getMessage() . "<br/>");
            }
        }
        break;

    case 'answ': //get answers
        $tmpd = file_get_contents("php://input");
        $json = json_decode($tmpd, true);
        $resuarr = array();
        try {
            foreach ($json as $k => $jsoni) {
                $quer = $pdo->prepare('SELECT * from `que` WHERE `name` = ?');
                $quer->execute(array(
                    filterQue($jsoni['que'])
                ));
                $res = $quer->fetchAll();
                $queid = 0;
                $ansr = array();
                if ($jsoni['answ'][0] == 'Select') {
                    if (count($res) > 0) {
                        $queid = $res[0]['id'];
                        $quer = $pdo->prepare('SELECT `name` FROM `answ` WHERE `qid`=?');
                        $quer->execute(array(
                            $queid
                        ));
                        $res = $quer->fetchAll();
                        $ansr_pre = $res;
                        for ($j = 0; $j < count($ansr_pre); $j++) {
                            $ansr[] = $ansr_pre[$j][0];
                        }
                        $ansr = implode('@@##@@', $ansr);
                    } else {
                        $ansr = 'idontfindselects';
                    }
                } else {
                    $jsonan = json_decode($jsoni['answ'], true);
                    if (count($res) > 0) {
                        $queid = $res[0]['id'];
                        //answers
                        for ($j = 0; $j < count($jsonan); $j++) {
                            $quer = $pdo->prepare('SELECT * FROM `answ` WHERE `name`=? AND `qid`=?');
                            $quer->execute(array(
                                filterAnswer($jsonan[$j]),
                                $queid
                            ));
                            $res = $quer->fetchAll();
                            if (count($res) > 0) $ansr[] = $res[0]['right'];
                            else $ansr[] = -1;
                        }
                    } else {
                        for ($j = 0; $j < count($jsonan); $j++) {
                            $ansr[] = -2;
                        }
                    }
                    
                }
                $quer = null;
                $resuarr[] = $ansr;
            }
            echo json_encode($resuarr);
        }
        catch (PDOException $e) {
            $pdo->rollback();
            die("Error!: " . $e->getMessage() . "<br/>");
        }
        break;

    case 'answt': //one row (text)
        $tmpd = file_get_contents("php://input");
        $json = json_decode($tmpd, true);
        $resuarr = array();
        try {
            foreach ($json as $k => $jsoni) {
                $quer = $pdo->prepare('SELECT * from `que` WHERE `name` = ? LIMIT 1');
                $quer->execute(array(
                    filterQue($jsoni['que'])
                ));
                $res = $quer->fetchAll();
                if (count($res) > 0) {
                    $queid = $res[0]['id'];
                    $quer = $pdo->prepare('SELECT * FROM `answ` WHERE `right`=1 AND `qid`=?');
                    $quer->execute(array(
                        $queid
                    ));
                    $res = $quer->fetchAll();
                    if (count($res) > 0) {
                        $resuarr[] = $res[0]['name'];
                    }
                }
                $quer = null;
            }
            echo json_encode($resuarr);
        }
        catch (PDOException $e) {
            $pdo->rollback();
            die("Error!: " . $e->getMessage() . "<br/>");
        }
        break;
}

function filterQue($q) {
    return preg_replace('/ src="(.+?)"/', '', $q);
}

function filterAnswer($q) {
    return preg_replace('/ src="(.+?)"/', '', $q);
}
