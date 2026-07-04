<?php
// Custom Adminer plugin: pre-configures the local dev PostgreSQL server so the
// login form has System (PostgreSQL) and Server (postgres) ready to go.
// Loaded automatically by the official Adminer image from /var/www/html/plugins-enabled/.
require_once('plugins/login-servers.php');

// [$description => ["server" => <host[:port]>, "driver" => "pgsql"]]
$servers = [
    'Local PostgreSQL (Docker)' => [
        'server' => 'postgres',
        'driver' => 'pgsql',
    ],
];

// Adminer 5 namespaces the plugin class; older versions use the global name.
$class = class_exists('Adminer\\AdminerLoginServers')
    ? 'Adminer\\AdminerLoginServers'
    : 'AdminerLoginServers';

return new $class($servers);
