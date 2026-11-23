
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import accuracy_score, f1_score, classification_report

from app.ai.engine import TRAINING_EXAMPLES


def create_models():
    """Create the three classification pipelines."""

    return {
        "Logistic Regression": LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=42
        ),

        "Multinomial Naive Bayes": MultinomialNB(),

        "Linear SVM": LinearSVC(
            class_weight="balanced",
            random_state=42
        )
    }


def compare_models():
    texts = [item[0] for item in TRAINING_EXAMPLES]
    labels = [item[1] for item in TRAINING_EXAMPLES]

    categories = sorted(set(labels))

    minimum_examples = min(
        labels.count(category) for category in categories
    )

    if minimum_examples < 5:
        raise ValueError(
            "Each category needs at least five examples."
        )

    cv = StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=42
    )

    results = []

    print("\n" + "=" * 65)
    print("SMART MUNICIPALITY AI - MODEL COMPARISON")
    print("=" * 65)

    print(f"\nDataset size: {len(texts)}")
    print(f"Number of categories: {len(categories)}")
    print("Cross-validation: Stratified 5-Fold")

    for name, classifier in create_models().items():

        pipeline = Pipeline([
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    lowercase=True,
                    strip_accents="unicode"
                )
            ),
            ("classifier", classifier)
        ])

        print(f"\nEvaluating {name}...")

        predictions = cross_val_predict(
            pipeline,
            texts,
            labels,
            cv=cv
        )

        accuracy = accuracy_score(labels, predictions)

        macro_f1 = f1_score(
            labels,
            predictions,
            average="macro"
        )

        weighted_f1 = f1_score(
            labels,
            predictions,
            average="weighted"
        )

        results.append({
            "name": name,
            "accuracy": accuracy,
            "macro_f1": macro_f1,
            "weighted_f1": weighted_f1
        })

        print(f"Accuracy: {accuracy * 100:.2f}%")
        print(f"Macro F1: {macro_f1:.3f}")
        print(f"Weighted F1: {weighted_f1:.3f}")

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

    results.sort(
        key=lambda result: (
            result["macro_f1"],
            result["accuracy"]
        ),
        reverse=True
    )

    print("\n" + "=" * 65)
    print("MODEL COMPARISON SUMMARY")
    print("=" * 65)

    for position, result in enumerate(results, start=1):
        print(
            f"{position}. {result['name']} | "
            f"Accuracy: {result['accuracy'] * 100:.2f}% | "
            f"Macro F1: {result['macro_f1']:.3f}"
        )

    print("\nBest preliminary model:")
    print(results[0]["name"])

    print(
        "\nIMPORTANT: Results are preliminary because the "
        "dataset contains illustrative examples."
    )


if __name__ == "__main__":
    compare_models()

