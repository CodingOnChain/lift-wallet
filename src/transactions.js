export function basic(amount, address, passphrase, ttl) {
    return {
        passphrase: passphrase,
        payments: [
            {
                address: address,
                amount: {
                    quantity: amount,
                    unit: "lovelace"
                }
            }
        ],
        time_to_live: {
            quantity: ttl,
            unit: "second"
        }
    };
}

export function registration(amount, address, passphrase, ttl, voterId) {
    return {
        passphrase: passphrase,
        payments: [
            {
                address: address,
                amount: {
                    quantity: amount,
                    unit: "lovelace"
                }
            }
        ],
        metadata: {
            700: {
                "map": [
                    { 
                        "k": { "string": "Service" },
                        "v": { "string": "LIFT" }
                    }
                ]
            },
            701: {
                "map": [
                    { 
                        "k": { "string": "Action" },
                        "v": { "string": "Registration" }
                    }
                ]
            },
            702: {
                "map": [
                    { 
                        "k": { "string": "VoterId" },
                        "v": { "string": voterId }
                    }
                ]
            }
        },
        time_to_live: {
            quantity: ttl,
            unit: "second"
        }
    };
}

export function createBallot(amount, address, passphrase, ttl, voterId, ballotId, items) {

    var ballotItems = [];
    items.forEach(i => {
        var choices = [];
        i.choices.forEach(c => {
            choices.push({
                "string": c
            });
        })

        ballotItems.push({ 
            "map": [
                { 
                    "k": { "string": "Type" },
                    "v": { "string": i.type }
                },
                { 
                    "k": { "string": "Question" },
                    "v": { "string": i.question }
                },
                { 
                    "k": { "string": "Choices" },
                    "v": { "list": choices }
                }
            ]
        });
    });

    return {
        passphrase: passphrase,
        payments: [
            {
                address: address,
                amount: {
                    quantity: amount,
                    unit: "lovelace"
                }
            }
        ],
        metadata: {
            700: {
                "map": [
                    { 
                        "k": { "string": "Service" },
                        "v": { "string": "LIFT" }
                    }
                ]
            },
            701: {
                "map": [
                    { 
                        "k": { "string": "Action" },
                        "v": { "string": "CreateBallot" }
                    }
                ]
            },
            702: {
                "map": [
                    { 
                        "k": { "string": "VoterId" },
                        "v": { "string": voterId }
                    }
                ]
            },
            703: {
                "map": [
                    { 
                        "k": { "string": "BallotId" },
                        "v": { "string": ballotId }
                    }
                ]
            },
            704: {
                "list": ballotItems
            }
        },
        time_to_live: {
            quantity: ttl,
            unit: "second"
        }
    };
}

export function castBallot(amount, address, passphrase, ttl, voterId, ballotId, castBallotId, items) {

    var castItems = [];
    items.forEach(i => {
        var choices = [];
        i.choices.forEach(c => {
            choices.push({
                "string": c
            });
        })

        castItems.push({ 
            "map": [
                { 
                    "k": { "string": "Question" },
                    "v": { "string": i.questionId }
                },
                { 
                    "k": { "string": "Choices" },
                    "v": { "list": choices }
                }
            ]
        });
    });

    return {
        passphrase: passphrase,
        payments: [
            {
                address: address,
                amount: {
                    quantity: amount,
                    unit: "lovelace"
                }
            }
        ],
        metadata: {
            700: {
                "map": [
                    { 
                        "k": { "string": "Service" },
                        "v": { "string": "LIFT" }
                    }
                ]
            },
            701: {
                "map": [
                    { 
                        "k": { "string": "Action" },
                        "v": { "string": "CastBallot" }
                    }
                ]
            },
            702: {
                "map": [
                    { 
                        "k": { "string": "VoterId" },
                        "v": { "string": voterId }
                    }
                ]
            },
            703: {
                "map": [
                    { 
                        "k": { "string": "BallotId" },
                        "v": { "string": ballotId }
                    }
                ]
            },
            705: {
                "map": [
                    { 
                        "k": { "string": "CastBallotId" },
                        "v": { "string": castBallotId }
                    }
                ]
            },
            706: {
                "list": castItems
            }
        },
        time_to_live: {
            quantity: ttl,
            unit: "second"
        }
    };
}