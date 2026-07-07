import json
with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read()
json_str = content[content.index('{'):content.rindex('}')+1]
data = json.loads(json_str)

# Check ALL benefit objects for non-string link/name
bad = []
for key, items in data.items():
    if isinstance(items, list):
        for idx, item in enumerate(items):
            if isinstance(item, dict) and 'benefits' in item:
                for bi, b in enumerate(item['benefits']):
                    for field in ['link', 'name', 'desc']:
                        if field in b and not isinstance(b[field], str) and b[field] is not None:
                            bad.append((key, idx, item.get('id'), item.get('title',''), bi, field, type(b[field]).__name__, b[field]))
            elif isinstance(item, dict):
                for field in ['link', 'name', 'desc']:
                    if field in item and not isinstance(item[field], str) and item[field] is not None:
                        bad.append((key, idx, item.get('id'), item.get('title',''), -1, field, type(item[field]).__name__, item[field]))

print(f'Found {len(bad)} non-string field values:')
for entry in bad:
    print(entry)
if not bad:
    print('ALL string-expected fields are strings!')
