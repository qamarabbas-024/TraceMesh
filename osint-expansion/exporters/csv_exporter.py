"""CSV investigation report exporter."""
import csv, io


def export_to_csv(data: dict) -> str:
    """Flatten investigation results into tabular CSV format."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Module", "Key", "Value"])

    for module, result in data.items():
        if module == "_meta":
            continue
        if isinstance(result, dict):
            for k, v in result.items():
                writer.writerow([module, k, str(v)])
        else:
            writer.writerow([module, "Result", str(result)])

    return output.getvalue()
