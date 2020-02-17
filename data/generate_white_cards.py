import csv
import json

FILE = './white-cards-2.1.csv'
OUTPUT = './white-cards-2.1.json'

with open(FILE, newline='') as cards_csv:
    reader = csv.reader(cards_csv)
    raw_cards = [line for line in reader]

    cards = [{
        "text": raw_card[0],
        } for raw_card in raw_cards
    ]

    with open(OUTPUT, 'w') as output_file:
        output_file.write(json.dumps(cards, indent=2))
