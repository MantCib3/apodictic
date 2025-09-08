import json
import uuid
from datetime import datetime

def clean_json_string(json_str):
    """Clean JSON string by fixing unterminated strings and missing delimiters."""
    try:
        json.loads(json_str)
        return json_str
    except json.JSONDecodeError as e:
        if "Unterminated string" in str(e) or "Expecting ',' delimiter" in str(e):
            # Attempt to fix unterminated string and missing comma
            problem_index = e.colno
            cleaned_str = json_str[:problem_index]
            # Look for the last incomplete object or array
            if json_str[problem_index-1] == '"':
                cleaned_str = cleaned_str[:-1] + '"}'  # Close string and object
            else:
                cleaned_str += '"}'  # Close string and object
            # Ensure the array is properly closed
            if not json_str.strip().endswith(']'):
                cleaned_str = cleaned_str.rstrip('}') + '}]'
            try:
                json.loads(cleaned_str)
                return cleaned_str
            except json.JSONDecodeError as e2:
                print(f"Still invalid after fix attempt: {str(e2)}")
                print(f"Problematic JSON section: {json_str[max(0, e.colno-50):min(len(json_str), e.colno+50)]}")
        raise ValueError("Failed to clean JSON string.")

def clean_json_data(input_file, output_file):
    try:
        with open(input_file, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found.")
        return
    except json.JSONDecodeError as e:
        print(f"Error: Input file '{input_file}' is not valid JSON. {str(e)}")
        return

    try:
        cleaned_response = clean_json_string(data['ai_response'])
        items = json.loads(cleaned_response)
    except (KeyError, json.JSONDecodeError, ValueError) as e:
        print(f"Error: Failed to parse 'ai_response' field. {str(e)}")
        return

    cleaned_data = {"articles": []}

    for item in items:
        if not isinstance(item, dict) or 'dot_points' not in item or 'lead' not in item:
            print(f"Warning: Skipping invalid item: {item}")
            continue

        title = item['dot_points'][0] if item['dot_points'] else item['lead']
        category = "Financial" if any(keyword in item['content'].lower() for keyword in [
            'acquisition', 'inflation', 'tax', 'investment', 'shares', 'ipo', 'rates', 'credit'
        ]) else "Business"

        article = {
            "title": title,
            "content": item['content'].strip(),
            "category": category,
            "id": item['id'],
            "date": item['date'],
            "lead": item['lead'],
            "image": item['image'],
            "dot_points": item['dot_points'],
            "sources": item['sources'],
            "quotes": item['quotes']
        }

        cleaned_data['articles'].append(article)

    try:
        with open(output_file, 'w') as f:
            json.dump(cleaned_data, f, indent=4)
        print(f"Cleaned JSON has been written to {output_file}")
    except Exception as e:
        print(f"Error: Failed to write to output file '{output_file}'. {str(e)}")

if __name__ == "__main__":
    input_file = "./Production/ai-output.json"
    output_file = "./Production/cleaned-ai-output.json"
    clean_json_data(input_file, output_file)