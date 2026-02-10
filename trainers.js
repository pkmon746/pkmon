// Trainer Persona Logic for Agent Moltbook

class TrainerAI {
    constructor(name, color, avatarId, personality) {
        this.name = name;
        this.color = color;
        this.avatar = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/${avatarId}.png`;

        // Fallback to Pokemon sprites that represent them
        if (name === 'Ash') this.avatar = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png'; // Pikachu
        if (name === 'Misty') this.avatar = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/121.png'; // Starmie
        if (name === 'Brock') this.avatar = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/95.png'; // Onix
        if (name === 'Lillie') this.avatar = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/789.png'; // Cosmog
        if (name === 'Acerola') this.avatar = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/778.png'; // Mimikyu
        if (name === 'Cynthia') this.avatar = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/445.png'; // Garchomp
        if (name === 'Red') this.avatar = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png'; // Charizard
        if (name === 'Iono') this.avatar = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/939.png'; // Bellibolt

        this.personality = personality;
    }

    react(event, context) {
        const reactions = this.personality[event];
        if (!reactions) return null;

        // Return random response template populated with context
        const template = reactions[Math.floor(Math.random() * reactions.length)];
        return template.replace(/{(\w+)}/g, (_, key) => context[key] || '?');
    }
}

const TRAINERS = [
    new TrainerAI('Ash', '#EF4444', 0, {
        bet_placed: [
            "Whoa! A big bet on Team {team}! Go for it!",
            "The spirit of competition is heating up!",
            "I choose you, Team {team}!",
            "That's some serious confidence in Team {team}!",
            "Everyone's getting fired up!"
        ],
        matchup: [
            "This matchup looks intense!",
            "I can't wait to see how this plays out!",
            "Both teams look strong!",
            "This is gonna be an amazing battle!"
        ],
        move_used: [
            "{move}! What an awesome choice!",
            "Great strategy using {move}!",
            "I love seeing {move} in action!",
            "That {move} is so cool!"
        ],
        crit_hit: [
            "Critical Hit! That's the power of friendship!",
            "Wow! Did you see that power?",
            "Don't give up! Hang in there!",
            "CRITICAL! The bond between trainer and Pokemon!"
        ],
        super_effective: [
            "It's super effective!",
            "Great type match-up!",
            "That's what I'm talking about!",
            "Knowledge of types wins battles!"
        ],
        low_hp: [
            "Hang in there! Don't give up!",
            "This is where champions are made!",
            "Never surrender!",
            "The battle isn't over yet!"
        ],
        win: [
            "What a battle! You guys were awesome!",
            "That was intense! Good game!",
            "I'm getting fired up just watching!",
            "Both sides gave it their all!"
        ],
        idle: [
            "I wonder what Pokemon we'll see next!",
            "My Pikachu is itching for a battle too.",
            "Hey Brock, who do you think will win?",
            "This arena has such amazing energy!",
            "I'm learning so much from watching these battles!"
        ]
    }),
    new TrainerAI('Brock', '#F59E0B', 0, {
        bet_placed: [
            "A sound investment strategy.",
            "Team {team} has a solid defense. Good choice.",
            "Analyzing the odds... interesting.",
            "The numbers favor Team {team} currently."
        ],
        matchup: [
            "Let me analyze the type matchups...",
            "Interesting stat distribution on both sides.",
            "This could go either way strategically.",
            "Defense vs offense - classic matchup."
        ],
        move_used: [
            "{move} - a tactical choice.",
            "The move {move} shows good battle IQ.",
            "Solid fundamentals with that {move}.",
            "Strategic use of {move}."
        ],
        crit_hit: [
            "That bypassed their defense entirely!",
            "A devastating blow to their stamina.",
            "Rock-solid attack!",
            "Precision and power combined!"
        ],
        super_effective: [
            "Type advantage is crucial in battle.",
            "They should have switched out.",
            "A classic elemental exploit.",
            "Textbook type effectiveness."
        ],
        low_hp: [
            "Critical health levels detected.",
            "They need a healing strategy.",
            "One more hit could end this.",
            "Stamina management is crucial now."
        ],
        win: [
            "Training and discipline pay off.",
            "A well-earned victory.",
            "Proper preparation prevents poor performance.",
            "Strategy executed perfectly."
        ],
        idle: [
            "Proper nutrition is key for Pokemon performance.",
            "I should cook some stew for the winners.",
            "Checking the stats on the next match...",
            "Defense stats are looking favorable...",
            "Rock-type moves would dominate here."
        ]
    }),
    new TrainerAI('Misty', '#3B82F6', 0, {
        bet_placed: [
            "Team {team} better not lose with that much money on them!",
            "Hmph, I would have bet on Water types.",
            "Are you sure about that bet?",
            "That's a bold move!",
            "Let's see if that pays off!"
        ],
        matchup: [
            "Where are the Water types?",
            "This matchup needs more water!",
            "I could teach them both a thing or two.",
            "My team would handle this easily."
        ],
        move_used: [
            "{move}? I've seen better.",
            "Not bad with that {move}.",
            "My Pokemon know stronger moves!",
            "{move} is decent, I suppose."
        ],
        crit_hit: [
            "Ouch! That looked painful!",
            "Stop holding back!",
            "Hit them harder!",
            "Now THAT'S a real attack!"
        ],
        super_effective: [
            "Washed them away!",
            "Total domination!",
            "That's how you do it!",
            "Finally, some real power!"
        ],
        low_hp: [
            "They're barely hanging on!",
            "One more hit should do it!",
            "Almost finished!",
            "Don't let up now!"
        ],
        win: [
            "Finally! That's what I call a win.",
            "Not bad, I guess.",
            "My water Pokemon could have done it faster.",
            "About time someone won with style!"
        ],
        idle: [
            "Where are all the Water types?",
            "This arena needs a pool.",
            "Psyduck, get back in your ball!",
            "Water beats Fire, everyone knows that.",
            "I miss Cerulean Gym..."
        ]
    }),
    new TrainerAI('Lillie', '#F472B6', 0, {
        bet_placed: [
            "Oh my! That's a lot of money...",
            "I hope everyone has fun!",
            "Good luck Team {team}!",
            "How exciting!",
            "Everyone is so passionate!"
        ],
        matchup: [
            "Both Pokemon look so strong!",
            "I'm a bit nervous but excited!",
            "Everyone looks ready to battle!",
            "This is wonderful to watch!"
        ],
        move_used: [
            "Oh! {move} is such a pretty move!",
            "I've read about {move} in books!",
            "{move}... I should write this down!",
            "Fascinating use of {move}!"
        ],
        crit_hit: [
            "Oh no! Are they okay?",
            "That looked really strong!",
            "Please be careful!",
            "Such incredible power..."
        ],
        super_effective: [
            "An amazing strategy!",
            "They studied their type matchups well.",
            "Incredible power!",
            "The type advantage was perfect!"
        ],
        low_hp: [
            "Oh dear, they're getting tired...",
            "Please hold on a little longer!",
            "I hope they'll be okay!",
            "This is getting intense!"
        ],
        win: [
            "Congratulations! A wonderful battle.",
            "Everyone did their best.",
            "I learned so much from watching.",
            "What a beautiful display of skill!"
        ],
        idle: [
            "Nebby, stay in the bag!",
            "I'm writing this down in my journal.",
            "Everyone looks so strong today.",
            "Professor Kukui would love to see this!",
            "I've learned so much about battles!"
        ]
    }),
    new TrainerAI('Acerola', '#A78BFA', 0, {
        bet_placed: [
            "Hehe, money is appearing like a ghost!",
            "Spooky amounts of cash!",
            "Team {team} has a ghostly aura... I like it!",
            "OoOoOo~ mysterious betting!",
            "The spirits approve of this bet!"
        ],
        matchup: [
            "I sense Ghost-type energy here...",
            "Spooky matchup incoming!",
            "The spirits are watching closely!",
            "This gives me chills... the good kind!"
        ],
        move_used: [
            "{move}! So spooky!",
            "Ooh, {move} is giving me goosebumps!",
            "The spirits love {move}!",
            "{move}~ what a haunting attack!"
        ],
        crit_hit: [
            "A surprise attack! Boo!",
            "Scary strong!",
            "Did you see that? It gave me chills!",
            "OoOoOo~ critical damage!"
        ],
        super_effective: [
            "Super spooky effective!",
            "Haunting logic!",
            "Ghost types would love that move.",
            "Perfectly frightening!"
        ],
        low_hp: [
            "They're fading like a ghost...",
            "Almost time to haunt the afterlife~",
            "Hanging on by a spectral thread!",
            "One more hit and they're ghosts!"
        ],
        win: [
            "The spirits were on their side.",
            "Hehe, come play at the Thrifty Megamart later!",
            "A chilling victory!",
            "Spooktacular performance!"
        ],
        idle: [
            "The air is getting cold...",
            "Do you hear that? Or is it just me?",
            "My Mimikyu wants to play battle too.",
            "Ghost types are the best!",
            "Anyone else feel a ghostly presence?"
        ]
    }),
    new TrainerAI('Cynthia', '#FCD34D', 0, {
        bet_placed: [
            "A bold wager. Let's see if it pays off.",
            "Fortune favors the brave.",
            "Interesting. The crowd is swaying to Team {team}.",
            "Strategic betting based on analysis.",
            "The odds shift in favor of Team {team}."
        ],
        matchup: [
            "Analyzing power levels and speed stats...",
            "This matchup requires careful observation.",
            "Both sides show potential for victory.",
            "A balanced battle ahead."
        ],
        move_used: [
            "{move} - an elegant choice.",
            "The tactical application of {move} is noteworthy.",
            "{move} demonstrates their training.",
            "Classic use of {move}."
        ],
        crit_hit: [
            "Precision and power.",
            "An opening has been exploited.",
            "There is no luck in battle, only preparation.",
            "Critical timing, perfectly executed."
        ],
        super_effective: [
            "Knowledge is power.",
            "A calculated strike.",
            "The outcome is becoming clear.",
            "Type advantage utilized perfectly."
        ],
        low_hp: [
            "The tide is turning.",
            "Victory is within reach.",
            "Endurance is being tested.",
            "The final moments approach."
        ],
        win: [
            "A champion understands defeat as well as victory.",
            "Well fought.",
            "Strength isn't just about power, it's about heart.",
            "Excellent battle strategy."
        ],
        idle: [
            "The history of this arena is fascinating.",
            "I'm taking notes for my next match.",
            "One must always be ready for a challenge.",
            "Every battle teaches something new.",
            "My Garchomp would enjoy this arena."
        ]
    }),
    new TrainerAI('Red', '#DC2626', 0, {
        bet_placed: ["...", "...!", "... $PKMON.", "...Team {team}.", "......"],
        matchup: ["...", "...!", "......", "..."],
        move_used: ["...{move}!", "...", "...!!", "...{move}."],
        crit_hit: ["...!", "...", "...!!", "......!"],
        super_effective: ["...", "...!", "...", "...!!"],
        low_hp: ["...", "...!", "......", "..."],
        win: ["...", "...!", "Good.", "...GG."],
        idle: ["...", "...", "...", "......", "..."]
    }),
    new TrainerAI('Iono', '#EC4899', 0, {
        bet_placed: [
            "Chat! Look at that donation! POG!",
            "Whose side are you on? Team {team} let's gooo!",
            "Show me the bits! $MONAD raining down!",
            "YOOOOO Team {team} getting the bag!",
            "That's what I call viewer engagement!"
        ],
        matchup: [
            "Okay chat, predictions in the comments!",
            "This is gonna be HYPE!",
            "Stream starting to POP OFF!",
            "Let's GOOOO! Who are you rooting for, chat?"
        ],
        move_used: [
            "{move}? POGGERS!",
            "Did you SEE that {move}?! Clip it!",
            "{move} on stream! Content!",
            "Chat is spamming {move} right now!"
        ],
        crit_hit: [
            "Clip that! CLIP THAT!",
            "Massive damage! OMEGALUL!",
            "Rekt!",
            "YOOOOO CRITICAL! Chat going wild!"
        ],
        super_effective: [
            "Super effective vibes!",
            "Chat is going wild!",
            "Can we get some Ws in the chat?",
            "POGGIES in the chat!"
        ],
        low_hp: [
            "It's getting SPICY chat!",
            "Almost GG!",
            "One more hit and it's over!",
            "Clutch time! Can they survive?"
        ],
        win: [
            "GGs only!",
            "What a stream! Thanks for watching!",
            "Don't forget to like and subscribe!",
            "WOOOO! Stream MVP right there!"
        ],
        idle: [
            "Any shiny hunters in chat?",
            "Streaming live from the Battle Arena!",
            "Check out my new hair clip! So cute!",
            "Remember to follow and subscribe!",
            "Chat, what's your favorite Pokemon?"
        ]
    })
];

export { TRAINERS, TrainerAI };
