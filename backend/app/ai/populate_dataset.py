
import csv
from pathlib import Path

DATASET_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "complaints_training.csv"
)

TRAINING_DATA = [
    # ROADS AND TRANSPORT
    ("There is a deep pothole in the road near the school", "Roads and Transport"),
    ("The road surface is badly damaged and unsafe for drivers", "Roads and Transport"),
    ("Several potholes are making it difficult to drive through our street", "Roads and Transport"),
    ("The traffic lights at the main intersection are not working", "Roads and Transport"),
    ("A section of the road has collapsed after heavy rain", "Roads and Transport"),
    ("The pedestrian crossing markings have faded and are difficult to see", "Roads and Transport"),
    ("A large pothole has damaged vehicles on our road", "Roads and Transport"),
    ("The road is covered with loose stones and broken asphalt", "Roads and Transport"),
    ("Street drainage is blocked and water is damaging the road", "Roads and Transport"),
    ("The traffic signal keeps switching off at the busy intersection", "Roads and Transport"),
    ("The road has several cracks that are becoming larger", "Roads and Transport"),
    ("A stop sign is missing at the residential intersection", "Roads and Transport"),
    ("The traffic lights are stuck on red", "Roads and Transport"),
    ("The pavement is damaged and difficult for pedestrians to use", "Roads and Transport"),
    ("The road markings are faded and drivers cannot see the lanes", "Roads and Transport"),
    ("A tree has fallen across the road and is blocking traffic", "Roads and Transport"),
    ("The stormwater drain is blocked and causing water to collect on the road", "Roads and Transport"),
    ("The gravel road has become difficult to drive on after heavy rain", "Roads and Transport"),
    ("A road sign has been knocked down near the school", "Roads and Transport"),
    ("The pedestrian walkway has been damaged by construction work", "Roads and Transport"),

    # WATER AND SANITATION
    ("There is no water supply in our area for two days", "Water and Sanitation"),
    ("A water pipe is leaking continuously outside our homes", "Water and Sanitation"),
    ("Clean water is coming out slowly from the household taps", "Water and Sanitation"),
    ("Sewage is overflowing into the street near our houses", "Water and Sanitation"),
    ("The municipal water meter pipe has burst", "Water and Sanitation"),
    ("Residents are experiencing a water shortage in the neighbourhood", "Water and Sanitation"),
    ("A sewer manhole is overflowing and producing a bad smell", "Water and Sanitation"),
    ("Water from a broken municipal pipe is flooding the pavement", "Water and Sanitation"),
    ("Our community has not received running water since yesterday", "Water and Sanitation"),
    ("Dirty wastewater is flowing from a damaged sewer pipe", "Water and Sanitation"),
    ("The water pressure in our street is extremely low", "Water and Sanitation"),
    ("A leaking water connection is wasting water outside the property", "Water and Sanitation"),
    ("The municipal tap is producing dirty and discoloured water", "Water and Sanitation"),
    ("A blocked sewer drain is causing wastewater to collect outside", "Water and Sanitation"),
    ("The water meter is damaged and appears to be leaking", "Water and Sanitation"),
    ("Residents have been without water since the municipal repair work", "Water and Sanitation"),
    ("A broken water valve is flooding the nearby road", "Water and Sanitation"),
    ("The sewer pipe behind our homes is blocked", "Water and Sanitation"),
    ("Water is leaking from an underground municipal pipe", "Water and Sanitation"),
    ("The community standpipe is not working", "Water and Sanitation"),

    # ELECTRICITY
    ("The electricity supply has been interrupted in our street", "Electricity"),
    ("A street light is broken and the road is dark at night", "Electricity"),
    ("Power cables are hanging dangerously close to the pavement", "Electricity"),
    ("The municipal electricity box outside the property is damaged", "Electricity"),
    ("Several street lights are not switching on after sunset", "Electricity"),
    ("There is a power outage affecting houses in our area", "Electricity"),
    ("An electrical pole appears damaged and is leaning over the road", "Electricity"),
    ("The street lights keep flickering and switching off", "Electricity"),
    ("A fallen electricity cable is lying near the roadside", "Electricity"),
    ("The public lighting near the community centre is not working", "Electricity"),
    ("The electricity meter box has been damaged", "Electricity"),
    ("Power keeps going off in our neighbourhood", "Electricity"),
    ("The street lamp outside the clinic is not working", "Electricity"),
    ("An electricity pole has fallen near the residential area", "Electricity"),
    ("The electrical transformer is making unusual noises", "Electricity"),
    ("The municipal street lights switch off during the night", "Electricity"),
    ("Several houses have lost electricity after a storm", "Electricity"),
    ("The electrical distribution box has an exposed cable", "Electricity"),
    ("The street lighting near the taxi rank is not working", "Electricity"),
    ("The power supply keeps fluctuating in our street", "Electricity"),

    # WASTE MANAGEMENT
    ("Household rubbish has not been collected this week", "Waste Management"),
    ("Illegal dumping is taking place on the open field", "Waste Management"),
    ("Public rubbish bins are overflowing in the neighbourhood", "Waste Management"),
    ("Residents have reported an accumulation of waste near the road", "Waste Management"),
    ("The municipal refuse collection truck missed our street", "Waste Management"),
    ("Rubbish bags have been left scattered around the collection point", "Waste Management"),
    ("There is a large pile of dumped building waste near the park", "Waste Management"),
    ("The community bins have not been emptied for several days", "Waste Management"),
    ("Uncollected waste is attracting pests in our area", "Waste Management"),
    ("Illegal dumping is blocking access to the open space", "Waste Management"),
    ("Household waste has been left on the pavement for several days", "Waste Management"),
    ("The rubbish collection schedule has not been followed", "Waste Management"),
    ("Residents are dumping old furniture beside the road", "Waste Management"),
    ("The public waste container is damaged and cannot be used", "Waste Management"),
    ("Plastic waste is scattered around the community park", "Waste Management"),
    ("Garden refuse has not been collected from our street", "Waste Management"),
    ("The dumping site near our homes is becoming overcrowded", "Waste Management"),
    ("Rubbish is accumulating around the local shopping area", "Waste Management"),
    ("The municipal waste bins have broken lids", "Waste Management"),
    ("Construction rubble has been dumped on an open public space", "Waste Management"),

    # PUBLIC FACILITIES
    ("The roof of the community hall is damaged and leaking", "Public Facilities"),
    ("A public park bench has been broken", "Public Facilities"),
    ("The playground equipment at the municipal park is damaged", "Public Facilities"),
    ("The public toilet at the community centre is not functioning", "Public Facilities"),
    ("Broken windows need repair at the municipal library", "Public Facilities"),
    ("The community hall doors are damaged and cannot close properly", "Public Facilities"),
    ("Several lights inside the public library are not working", "Public Facilities"),
    ("The fence around the municipal sports ground is damaged", "Public Facilities"),
    ("The public swimming pool changing facilities need maintenance", "Public Facilities"),
    ("The roof structure at the public recreation centre needs repair", "Public Facilities"),
    ("The municipal clinic waiting area has damaged seating", "Public Facilities"),
    ("The public library entrance door is broken", "Public Facilities"),
    ("The community sports field has damaged goalposts", "Public Facilities"),
    ("The park playground swing is broken and unsafe", "Public Facilities"),
    ("The public toilet doors at the park are damaged", "Public Facilities"),
    ("The municipal community centre needs window repairs", "Public Facilities"),
    ("The benches at the public bus shelter are damaged", "Public Facilities"),
    ("The fence surrounding the public playground has a hole", "Public Facilities"),
    ("The community hall floor tiles are broken", "Public Facilities"),
    ("The public recreation centre has damaged ceiling panels", "Public Facilities"),
]


def populate_dataset():
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Write a fresh dataset with one header row.
    with DATASET_PATH.open(
        mode="w",
        encoding="utf-8",
        newline=""
    ) as file:
        writer = csv.writer(file)

        writer.writerow(["description", "category"])
        writer.writerows(TRAINING_DATA)

    print("=" * 55)
    print("SMART MUNICIPALITY AI - DATASET POPULATION")
    print("=" * 55)

    print(f"\nDataset saved to: {DATASET_PATH}")
    print(f"Total examples: {len(TRAINING_DATA)}")

    print("\nCategory distribution:")

    categories = sorted(set(category for _, category in TRAINING_DATA))

    for category in categories:
        count = sum(
            1 for _, label in TRAINING_DATA
            if label == category
        )
        print(f"- {category}: {count} examples")

    print("\nDATASET POPULATION COMPLETED")


if __name__ == "__main__":
    populate_dataset()
