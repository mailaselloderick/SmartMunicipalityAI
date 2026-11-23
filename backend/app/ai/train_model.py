
import joblib

from app.ai.engine import (
    MODEL_PATH,
    TRAINING_EXAMPLES,
    build_model
)


def train_model():
    texts = [item[0] for item in TRAINING_EXAMPLES]
    labels = [item[1] for item in TRAINING_EXAMPLES]

    categories = sorted(set(labels))

    print("\nSMART MUNICIPALITY AI - MODEL TRAINING")
    print("=" * 50)

    print(f"Training examples: {len(texts)}")
    print(f"Categories: {len(categories)}")

    for category in categories:
        print(
            f"- {category}: "
            f"{labels.count(category)} examples"
        )

    model = build_model()
    model.fit(texts, labels)

    MODEL_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(model, MODEL_PATH)

    print("\nTRAINING COMPLETED")
    print(f"Model saved to: {MODEL_PATH}")


if __name__ == "__main__":
    train_model()
