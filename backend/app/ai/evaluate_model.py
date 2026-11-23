
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

from app.ai.engine import TRAINING_EXAMPLES, build_model


def evaluate_model():
    print("\n" + "=" * 60)
    print("SMART MUNICIPALITY AI - MODEL EVALUATION")
    print("=" * 60)

    texts = [item[0] for item in TRAINING_EXAMPLES]
    labels = [item[1] for item in TRAINING_EXAMPLES]

    categories = sorted(set(labels))

    print(f"\nTotal examples: {len(texts)}")
    print(f"Number of categories: {len(categories)}")

    print("\nCategory distribution:")

    for category in categories:
        print(f"- {category}: {labels.count(category)} examples")

    # Five-fold evaluation requires at least five examples
    # in every category.
    minimum_examples = min(labels.count(c) for c in categories)

    if minimum_examples < 5:
        raise ValueError(
            "Every category needs at least five examples "
            "for five-fold cross-validation."
        )

    model = build_model()

    cross_validation = StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=42
    )

    print("\nRunning Stratified 5-Fold Cross-Validation...")

    predictions = cross_val_predict(
        model,
        texts,
        labels,
        cv=cross_validation
    )

    accuracy = accuracy_score(labels, predictions)

    print("\n" + "=" * 60)
    print("MODEL PERFORMANCE")
    print("=" * 60)

    print(f"\nAccuracy: {accuracy * 100:.2f}%")

    print("\nClassification Report:")

    print(
        classification_report(
            labels,
            predictions,
            labels=categories,
            target_names=categories,
            zero_division=0
        )
    )

    matrix = confusion_matrix(
        labels,
        predictions,
        labels=categories
    )

    print("\nConfusion Matrix:")
    print("Category order:", categories)
    print(matrix)

    print("\n" + "=" * 60)
    print("EVALUATION COMPLETED")
    print("=" * 60)

    print(
        "\nIMPORTANT:"
        "\nThis dataset contains illustrative examples."
        "\nCross-validation results are preliminary."
        "\nThey do not establish real-world municipal accuracy."
        "\nHuman review is required before acting on predictions."
    )


if __name__ == "__main__":
    evaluate_model()

