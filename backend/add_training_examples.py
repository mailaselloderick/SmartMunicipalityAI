
import csv
from pathlib import Path

DATASET_PATH = Path("data/complaints_training.csv")

new_examples = {
    "Water and Sanitation": [
        "A water pipe is leaking beside the main road and residents have no water.",
        "A burst municipal water pipe is flooding the street.",
        "Water is leaking from a pipe underneath the pavement.",
        "Residents have no running water because a municipal pipe is damaged.",
        "A leaking water pipe is causing flooding outside nearby houses.",
        "The municipal water connection beside the road is broken.",
        "A sewer pipe is leaking wastewater onto the street.",
        "Water from a damaged municipal pipe is flowing across the road.",
        "The community has been without water due to a burst pipeline.",
        "A broken water valve is causing water to collect along the pavement."
    ],
    "Roads and Transport": [
        "A large pothole is damaging vehicles on the main road.",
        "The road surface is cracked and dangerous for motorists.",
        "Traffic lights at the intersection are not working.",
        "A road has collapsed and vehicles cannot pass safely.",
        "A missing stop sign is creating danger at the intersection.",
        "The pedestrian crossing markings need repainting.",
        "A fallen tree is blocking vehicles on the road.",
        "Loose stones and damaged asphalt are making driving difficult.",
        "A blocked stormwater drain is causing flooding on the road.",
        "The pavement is damaged and pedestrians cannot walk safely."
    ]
}

existing = set()

with DATASET_PATH.open(
    "r", encoding="utf-8-sig", newline=""
) as file:
    reader = csv.DictReader(file)
    for row in reader:
        existing.add(
            (
                row["description"].strip().lower(),
                row["category"].strip()
            )
        )

added = 0

with DATASET_PATH.open(
    "a", encoding="utf-8", newline=""
) as file:
    writer = csv.writer(file)

    for category, descriptions in new_examples.items():
        for description in descriptions:
            key = (description.lower(), category)

            if key not in existing:
                writer.writerow([description, category])
                existing.add(key)
                added += 1

print(f"Added {added} new training examples.")

for category in new_examples:
    count = sum(
        1 for _, label in existing
        if label == category
    )
    print(f"{category}: {count} examples")
