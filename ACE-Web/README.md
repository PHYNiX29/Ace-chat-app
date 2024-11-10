{
	"Version": "2012-10-17",
	"Id": "Policy1731157000556",
	"Statement": [
		{
			"Sid": "Stmt1731156998178",
			"Effect": "Allow",
			"Principal": {
				"AWS": "arn:aws:iam::974962882698:user/nodejs"
			},
			"Action": [
				"s3:GetObject",
				"s3:PutObject"
			],
			"Resource": "arn:aws:s3:::chatvaibhav/*"
		}
	]
}