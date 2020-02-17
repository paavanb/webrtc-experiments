import csv
import json

FILE = './black-cards-2.1.csv'
OUTPUT = './black-cards-2.1.json'

ALLOWED_SPECIALS = set(['', 'PICK 2'])

with open(FILE, newline='') as cards_csv:
    reader = csv.reader(cards_csv)
    raw_cards = [line for line in reader]

    filtered_cards = [
        card for card in raw_cards
        if len(card) == 2 and card[1] in ALLOWED_SPECIALS
    ]

    cards = [{
        "text": raw_card[0],
        "pick": 2 if len(raw_card) >= 1 and raw_card[1] == 'PICK 2' else 1,
        } for raw_card in filtered_cards
    ]

    with open(OUTPUT, 'w') as output_file:
        output_file.write(json.dumps(cards, indent=2))
