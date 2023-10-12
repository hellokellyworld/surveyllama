const fs = require("file-system");
const path = require("path");
const { sep } = require("path");
const tmp = require("tmp-promise");
const validTempFolderPath = require("../../../config/temp.config").userTempFolderPath;
const sanitize = require("sanitize-filename");

exports.makeTempFolder = async function (basepath) {
	return new Promise((resolve, reject) => {
		const defaultPath = path.resolve(__dirname, "../../../dist");
		tempfolderpath = basepath ? basepath : defaultPath;
		fs.mkdtemp(`${tempfolderpath}${sep}`, (err, folder) => {
			if (err) {
				reject(err);
			}
			resolve(folder);
		});
	});
};

exports.removeFolder = async function (basepath, folderName) {
	return new Promise((resolve, reject) => {
		const defaultPath = path.resolve(__dirname, "../../../dist/" + folderName);
		folderpath = basepath ? path.join(basepath, folderName) : defaultPath;
		fs.rm(folderpath, { recursive: true }, function (err) {
			if (err) {
				reject(err);
			}
			resolve(folderpath);
		});
	});
};

exports.makeTempFile = async function (basepath, filePrefix, filePostfix) {
	//prefix = qrcode-, tmp- ; postfix= .txt, .png
	return new Promise((resolve, reject) => {
		const tempFileWritePath = basepath + "/" + filePrefix + "XXXXXX" + filePostfix;
		tmp.file({ template: tempFileWritePath }).then((o) => {
			resolve(o);
		});
	});
};

exports.removeFile = async function (basepath, fileName) {
	return new Promise((resolve, reject) => {
		const defaultPath = path.resolve(__dirname, "../../../dist/" + fileName);
		filepath = basepath ? path.join(basepath, fileName) : defaultPath;
		fs.rm(filepath, {}, function (err) {
			if (err) {
				reject(err);
			}
			resolve(filepath);
		});
	});
};

exports.writeFile = async function (fileData, fileName, filePath) {
	//to add file type handling in future work
	return new Promise((resolve, reject) => {
		const generatedFilePath = path.join(filePath, fileName);
		const writeFilePath = filePath ? filePath : generatedFilePath;
		fs.writeFile(writeFilePath, fileData, function (err) {
			if (err) {
				reject(err);
			}
			resolve(filePath);
		});
	});
};

exports.checkFilePathSafety = (fullAbsoluteFilePath) => {
	if (fullAbsoluteFilePath == "" || fullAbsoluteFilePath == null) {
		return false;
	} else {
		const normalizedFullAbsoluteFilePath = path.normalize(path.join("/", fullAbsoluteFilePath));
		const sanitizedFileName = sanitize(path.basename(normalizedFullAbsoluteFilePath));
		const validFullFilePath = path.normalize(path.join(validTempFolderPath, "/dist/tmp/", sanitizedFileName));
		if (normalizedFullAbsoluteFilePath == validFullFilePath) {
			return true;
		} else {
			return false;
		}
	}
};
