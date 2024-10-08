// Get the access token from the URL parameters
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('access_token');

// Check if access token is present; if not, redirect to Discord authentication
if (!accessToken) {
    window.location.href = '/auth/discord'; // Redirect to Discord authentication
}

// Document ready function
$(document).ready(function() {
    // Log access token for debugging
    console.log("Access Token: ", accessToken);

    // Fetch user info from Discord API
    fetch('https://discord.com/api/users/@me', {
        headers: {
            Authorization: `Bearer ${accessToken}` // Correctly formatted token
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch user data');
        return response.json();
    })
    .then(data => {
        // Check if data is valid and has necessary properties
        if (data && data.username && data.id) {
            $('#user-name').text(data.username);
            $('#profile-pic').attr('src', data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : 'https://via.placeholder.com/40');
        } else {
            console.error('User data is not valid:', data);
            alert('Failed to retrieve user information.');
        }
    })
    .catch(err => {
        console.error(err);
        alert('Error fetching user information. Please try again.');
    });

    // Fetch bot stats from the API
    fetch('https://CHANGEME.pro/api/stats')
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch stats');
            return response.json();
        })
        .then(stats => {
            // Display bot stats
            $('#total-users').text(stats.totalUsers);
            $('#total-servers').text(stats.totalServers);
            $('#latency').text(stats.latency);
        })
        .catch(err => {
            console.error(err);
            alert('Error fetching stats. Please try again.');
        });

    // Fetch user's guilds (servers)
    fetch('https://discord.com/api/users/@me/guilds', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch guilds');
        return response.json();
    })
    .then(guilds => {
        // Populate server select dropdown
        guilds.forEach(guild => {
            $('#server-select').append(new Option(guild.name, guild.id));
        });

        // Set up change event for server selection
        $('#server-select').change(function() {
            const selectedServerId = $(this).val();
            fetchCommands(selectedServerId);
        });
    })
    .catch(err => {
        console.error(err);
        alert('Error fetching guilds. Please try again.');
    });

    // Function to fetch and display commands for the selected server
    function fetchCommands(serverId) {
        fetch(`https://CHANGEME.pro/api/commands?serverId=${serverId}`)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch commands');
                return response.json();
            })
            .then(commands => {
                // Clear previous command entries
                $('#commands').empty();
                commands.forEach(command => {
                    const commandElement = $(`<div>
                        <span>${command.name}</span>
                        <button class="toggle-command" data-command-id="${command.id}" ${command.enabled ? 'data-enabled="true"' : 'data-enabled="false"'}>${command.enabled ? 'Disable' : 'Enable'}</button>
                    </div>`);
                    $('#commands').append(commandElement);
                });
            })
            .catch(err => {
                console.error(err);
                alert('Error fetching commands. Please try again.');
            });
    }

    // Handle command toggle button clicks
    $('#commands').on('click', '.toggle-command', function() {
        const commandId = $(this).data('command-id');
        const isEnabled = $(this).data('enabled');

        // Send request to toggle command
        fetch(`https://CHANGEME.pro/api/commands/${commandId}`, {
            method: 'PATCH', // or POST, depending on your API design
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({ enabled: !isEnabled })
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to toggle command');
            return response.json();
        })
        .then(updatedCommand => {
            // Update the button text and data attribute
            $(this).text(updatedCommand.enabled ? 'Disable' : 'Enable');
            $(this).data('enabled', updatedCommand.enabled);
        })
        .catch(err => {
            console.error(err);
            alert('Error toggling command. Please try again.');
        });
    });

    // Logout button functionality
    $('#logout').click(function() {
        // Redirect to your logout route or functionality
        window.location.href = '/'; // Change this to your logout URL
    });
});
