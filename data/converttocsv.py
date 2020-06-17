import csv


file_names = ["regional_averages_rr_year", "regional_averages_sd_year", "regional_averages_tm_year"]


def convert_to_csv(file_name):
    temp_result = []

    file = open(file_name + ".txt", "r")
    lines = file.readlines()
    lines = lines[1:]  # cut off first line
    cols_to_delete = [1, ]
    cols_to_copy = {}
    for line in lines:
        temp_result.append(line.split(";")[:-2])

    # prepare header
    for i in range(len(temp_result[0])):
        temp_result[0][i] = temp_result[0][i].replace("ue", "ü")
        if temp_result[0][i] == 'Brandenburg/Berlin':
            temp_result[0][i] = 'Berlin'
        if temp_result[0][i] == 'Thueringen/Sachsen-Anhalt':
            cols_to_delete.append(i)
        if temp_result[0][i] == 'Niedersachsen/Hamburg/Bremen':
            temp_result[0][i] = 'Hamburg'
            cols_to_copy[i] = 'Bremen'

    result = []
    # copy and remove columns
    for line in temp_result:
        temp = []
        for i in range(len(line)):
            if i not in cols_to_delete:
                temp.append(line[i])
            if i in cols_to_copy:
                temp.append(line[i])
        result.append(temp)
    for col in cols_to_copy.keys():
        result[0][col] = cols_to_copy[col]

    header = result[0]
    data = result[1:]
    # convert data to integer/float
    for i in range(len(data)):
        data[i][0] = int(data[i][0])
        for j in range(1, len(data[0])):
            data[i][j] = float(data[i][j])
    result = [header] + data

    # write to csv
    with open(file_name + ".csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(result)


for filename in file_names:
    convert_to_csv(filename)
